# Strata M1 · Plan 2 — Row Virtualization · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the grid body render only the visible window of rows, so it handles very large datasets (100k+ rows) at smooth scroll.

**Architecture:** The `BodyViewport` becomes a fixed-height scroll container. TanStack Virtual's `useVirtualizer` (wrapped in a `useRowVirtualizer` hook) computes which rows fall in the viewport; only those `GridRow`s are rendered, each absolutely positioned inside a full-height sizer element. Row height is fixed. `DataGrid` gains an optional `height` prop.

**Tech Stack:** TypeScript, React 18/19, `@tanstack/react-table` v8, `@tanstack/react-virtual` v3, tsup, Vitest + React Testing Library.

**Scope note:** This plan covers **row virtualization only**. Column virtualization was moved to Plan 5, where it is designed together with column pinning (pinned columns must never be virtualized away). Plan 2 does not change the header or introduce horizontal scrolling.

**Spec:** `docs/superpowers/specs/2026-05-21-strata-tree-data-grid-design.md`. Builds directly on Plan 1 (`docs/superpowers/plans/2026-05-21-strata-m1-plan-1-foundation.md`), which is merged to `master`.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `package.json` | modify | Add `@tanstack/react-virtual` dependency |
| `src/model/constants.ts` | modify | Add `ROW_HEIGHT`, `ROW_OVERSCAN`, `DEFAULT_GRID_HEIGHT` |
| `vitest.setup.ts` | modify | Mock `ResizeObserver` + `getBoundingClientRect` for jsdom |
| `src/virtual/use-row-virtualizer.ts` | create | Hook wrapping TanStack Virtual with Strata row config |
| `src/components/GridRow.tsx` | modify | Accept a positioning `style` prop |
| `src/components/BodyViewport.tsx` | modify | Scroll container + row virtualization |
| `src/components/GridRoot.tsx` | modify | Thread the `height` prop through |
| `src/components/DataGrid.tsx` | modify | Add the public `height` prop |
| `src/components/DataGrid.virtualization.test.tsx` | create | Virtualization behavior tests |
| `src/strata.css` | modify | Scroll-container + sizer layout |
| `playground/App.tsx` | modify | Demonstrate virtualization with many rows |

---

## Task 1: Add the `@tanstack/react-virtual` dependency

**Files:**
- Modify: `package.json` (via `npm install`)

- [ ] **Step 1: Install the package**

Run: `npm install @tanstack/react-virtual`
Expected: completes without errors; `package.json` `dependencies` now lists `@tanstack/react-virtual` (a `^3.x` range); `package-lock.json` updated.

- [ ] **Step 2: Verify**

Run: `node -e "console.log(require('./package.json').dependencies['@tanstack/react-virtual'])"`
Expected: prints a version range string (not `undefined`).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @tanstack/react-virtual dependency"
```

---

## Task 2: Virtualization constants

**Files:**
- Modify: `src/model/constants.ts`

- [ ] **Step 1: Replace `src/model/constants.ts` entirely**

```ts
/** Default column width in pixels, used when a column omits `width`. */
export const DEFAULT_COLUMN_WIDTH = 160;

/** Default minimum column width in pixels, used when a column omits `minWidth`. */
export const MIN_COLUMN_WIDTH = 48;

/** Height of a single body row in pixels. Body rows are a fixed height. */
export const ROW_HEIGHT = 32;

/** Number of extra rows rendered above and below the visible window. */
export const ROW_OVERSCAN = 8;

/** Default height of the scrollable grid body in pixels. */
export const DEFAULT_GRID_HEIGHT = 400;
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/model/constants.ts
git commit -m "feat: add row sizing and grid height constants"
```

---

## Task 3: jsdom virtualization test setup

TanStack Virtual measures its scroll element with `getBoundingClientRect` and a `ResizeObserver`. jsdom has no layout engine (every box is 0×0) and no `ResizeObserver`. Without this setup the virtualizer would compute a zero-height viewport and render no rows in tests.

**Files:**
- Modify: `vitest.setup.ts`

- [ ] **Step 1: Replace `vitest.setup.ts` entirely**

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// --- Virtualization test environment ---------------------------------------
// jsdom has no layout engine and no ResizeObserver. TanStack Virtual measures
// its scroll element with getBoundingClientRect and observes it with a
// ResizeObserver. Provide both so the row virtualizer renders rows in tests.

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

const TEST_VIEWPORT_WIDTH = 800;
const TEST_VIEWPORT_HEIGHT = 600;

Element.prototype.getBoundingClientRect = function getBoundingClientRect(): DOMRect {
  return {
    width: TEST_VIEWPORT_WIDTH,
    height: TEST_VIEWPORT_HEIGHT,
    top: 0,
    left: 0,
    right: TEST_VIEWPORT_WIDTH,
    bottom: TEST_VIEWPORT_HEIGHT,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
};
```

- [ ] **Step 2: Verify the existing suite still passes**

Run: `npm test`
Expected: PASS — 23 tests, 6 files (the Plan 1 suite is unaffected; it does not measure elements).

- [ ] **Step 3: Commit**

```bash
git add vitest.setup.ts
git commit -m "test: mock layout APIs so virtualization works in jsdom"
```

---

## Task 4: `useRowVirtualizer` hook

**Files:**
- Create: `src/virtual/use-row-virtualizer.ts`

- [ ] **Step 1: Create `src/virtual/use-row-virtualizer.ts`**

```ts
import type { RefObject } from 'react';
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import { ROW_HEIGHT, ROW_OVERSCAN } from '../model/constants';

export interface UseRowVirtualizerOptions {
  /** Ref to the scrollable body element. */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Total number of rows. */
  count: number;
}

/**
 * Wraps TanStack Virtual's `useVirtualizer` with Strata's fixed row height
 * and overscan. Returns the virtualizer that drives the body's visible window.
 */
export function useRowVirtualizer(
  options: UseRowVirtualizerOptions,
): Virtualizer<HTMLDivElement, Element> {
  const { scrollRef, count } = options;
  return useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: ROW_OVERSCAN,
  });
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/virtual/use-row-virtualizer.ts
git commit -m "feat: add useRowVirtualizer hook"
```

The hook is a thin wrapper over `useVirtualizer`; it is exercised by the integration tests in Task 6 rather than a dedicated unit test (testing it in isolation would require a mounted scroll element).

---

## Task 5: Let `GridRow` accept a positioning style

The virtualizer positions each row absolutely. `GridRow` needs to accept the inline style so the row element itself carries `position`/`transform` (keeping `role="row"` on the positioned element, with no extra wrapper div).

**Files:**
- Modify: `src/components/GridRow.tsx`

- [ ] **Step 1: Replace `src/components/GridRow.tsx` entirely**

```tsx
import type { CSSProperties } from 'react';
import type { Row } from '@tanstack/react-table';
import { DataCell } from './DataCell';

export interface GridRowProps<TRow> {
  /** The TanStack row to render. */
  row: Row<TRow>;
  /** Positioning style applied by the row virtualizer. */
  style?: CSSProperties;
}

/** Renders one body row as a horizontal strip of cells. */
export function GridRow<TRow>({ row, style }: GridRowProps<TRow>) {
  return (
    <div className="strata-row" role="row" style={style}>
      {row.getVisibleCells().map((cell) => (
        <DataCell key={cell.id} cell={cell} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks and existing tests still pass**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: PASS — 23 tests (adding an optional prop is non-breaking).

- [ ] **Step 3: Commit**

```bash
git add src/components/GridRow.tsx
git commit -m "feat: let GridRow accept a positioning style"
```

---

## Task 6: Virtualize the body

The core task. `BodyViewport` becomes a scroll container that renders only the visible window of rows; `GridRoot` and `DataGrid` thread a `height` prop through.

**Files:**
- Create: `src/components/DataGrid.virtualization.test.tsx`
- Modify: `src/components/BodyViewport.tsx`
- Modify: `src/components/GridRoot.tsx`
- Modify: `src/components/DataGrid.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/DataGrid.virtualization.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface ListRow {
  id: string;
  label: string;
}

function makeRows(count: number): ListRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i),
    label: `Row ${i}`,
  }));
}

const columns: ColumnDef<ListRow>[] = [
  { id: 'label', header: 'Label', accessor: 'label' },
];

describe('DataGrid — row virtualization', () => {
  it('renders only a window of rows for a large dataset', () => {
    render(<DataGrid data={makeRows(1000)} columns={columns} />);
    // Without virtualization this would be 1001 (1000 body rows + 1 header).
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(100);
  });

  it('renders the first rows but not rows far outside the viewport', () => {
    render(<DataGrid data={makeRows(1000)} columns={columns} />);
    expect(screen.getByText('Row 0')).toBeInTheDocument();
    expect(screen.queryByText('Row 999')).not.toBeInTheDocument();
  });

  it('sizes the scroll area to the full row count', () => {
    const { container } = render(
      <DataGrid data={makeRows(1000)} columns={columns} />,
    );
    const sizer = container.querySelector('.strata-body-sizer');
    expect(sizer).not.toBeNull();
    // 1000 rows * 32px row height
    expect((sizer as HTMLElement).style.height).toBe('32000px');
  });

  it('renders rows near the new position after scrolling', () => {
    const { container } = render(
      <DataGrid data={makeRows(1000)} columns={columns} />,
    );
    const scroller = container.querySelector('.strata-body') as HTMLElement;
    scroller.scrollTop = 16000; // ~row 500 at 32px per row
    fireEvent.scroll(scroller);
    expect(screen.getByText('Row 500')).toBeInTheDocument();
  });

  it('still renders every row for a small dataset', () => {
    render(<DataGrid data={makeRows(5)} columns={columns} />);
    for (let i = 0; i < 5; i += 1) {
      expect(screen.getByText(`Row ${i}`)).toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/DataGrid.virtualization.test.tsx`
Expected: FAIL — 3 of 5 tests fail (the grid currently renders all rows: the window test sees ~1001 rows, the far-row test finds `Row 999`, and `.strata-body-sizer` does not exist yet).

- [ ] **Step 3: Replace `src/components/BodyViewport.tsx`**

```tsx
import { useRef } from 'react';
import type { Table } from '@tanstack/react-table';
import { GridRow } from './GridRow';
import { useRowVirtualizer } from '../virtual/use-row-virtualizer';

export interface BodyViewportProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
  /** Height of the scrollable body area in pixels. */
  height: number;
}

/** Renders the grid body as a vertically virtualized scroll area. */
export function BodyViewport<TRow>({ table, height }: BodyViewportProps<TRow>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const virtualizer = useRowVirtualizer({ scrollRef, count: rows.length });

  if (rows.length === 0) {
    return (
      <div
        className="strata-body strata-body-empty"
        role="rowgroup"
        style={{ height }}
      >
        <div className="strata-empty">No data</div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="strata-body" role="rowgroup" style={{ height }}>
      <div
        className="strata-body-sizer"
        role="presentation"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <GridRow
            key={virtualRow.key}
            row={rows[virtualRow.index]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Replace `src/components/GridRoot.tsx`**

```tsx
import type { Table } from '@tanstack/react-table';
import { HeaderArea } from './HeaderArea';
import { BodyViewport } from './BodyViewport';
import { GridFooter } from './GridFooter';

export interface GridRootProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
  /** Height of the scrollable body area in pixels. */
  height: number;
}

/** The grid layout shell. */
export function GridRoot<TRow>({ table, height }: GridRootProps<TRow>) {
  return (
    <div className="strata-grid" role="grid">
      <HeaderArea table={table} />
      <BodyViewport table={table} height={height} />
      <GridFooter rowCount={table.getRowModel().rows.length} />
    </div>
  );
}
```

- [ ] **Step 5: Replace `src/components/DataGrid.tsx`**

```tsx
import { useMemo } from 'react';
import type { ColumnDef } from '../model/types';
import { DEFAULT_GRID_HEIGHT } from '../model/constants';
import { useGridTable } from '../model/use-grid-table';
import { InMemoryDataSource } from '../data/in-memory-data-source';
import { GridRoot } from './GridRoot';

export interface DataGridProps<TRow> {
  /** The rows to display. */
  data: TRow[];
  /** The column definitions. */
  columns: ColumnDef<TRow>[];
  /** Height of the scrollable body area in pixels. Defaults to 400. */
  height?: number;
}

/** The public Strata grid component. */
export function DataGrid<TRow>({
  data,
  columns,
  height = DEFAULT_GRID_HEIGHT,
}: DataGridProps<TRow>) {
  const dataSource = useMemo(() => new InMemoryDataSource(data), [data]);
  const rows = dataSource.load();
  const table = useGridTable({ data: rows, columns });
  return <GridRoot table={table} height={height} />;
}
```

- [ ] **Step 6: Run the virtualization test to verify it passes**

Run: `npx vitest run src/components/DataGrid.virtualization.test.tsx`
Expected: PASS — 5 tests passing.

- [ ] **Step 7: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — 28 tests, 7 files (Plan 1's 23 + Plan 2's 5). Plan 1's tests still pass because the mocked viewport (600px) fully renders their small datasets.

- [ ] **Step 8: Commit**

```bash
git add src/components/BodyViewport.tsx src/components/GridRoot.tsx src/components/DataGrid.tsx src/components/DataGrid.virtualization.test.tsx
git commit -m "feat: virtualize body rows with TanStack Virtual"
```

---

## Task 7: Scroll-container and virtualization CSS

**Files:**
- Modify: `src/strata.css`

- [ ] **Step 1: Replace `src/strata.css` entirely**

```css
.strata-grid {
  display: flex;
  flex-direction: column;
  border: 1px solid #d1d1d6;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  overflow: hidden;
}

.strata-header {
  display: flex;
  flex-direction: column;
}

.strata-header-row {
  display: flex;
}

.strata-header-cell {
  box-sizing: border-box;
  padding: 6px 10px;
  font-weight: 600;
  background: #f5f5f7;
  border-bottom: 1px solid #d1d1d6;
  border-right: 1px solid #e5e5e7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strata-body {
  overflow-y: auto;
}

.strata-body-sizer {
  position: relative;
  width: 100%;
}

.strata-row {
  display: flex;
}

.strata-cell {
  box-sizing: border-box;
  padding: 6px 10px;
  border-bottom: 1px solid #e5e5e7;
  border-right: 1px solid #e5e5e7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strata-empty {
  padding: 24px;
  text-align: center;
  color: #86868b;
}

.strata-footer {
  padding: 6px 10px;
  background: #f5f5f7;
  border-top: 1px solid #d1d1d6;
  color: #86868b;
  font-size: 12px;
}
```

The only changes from Plan 1: `.strata-body` is now a vertical scroll container (`overflow-y: auto`; height is applied inline), and `.strata-body-sizer` is the full-height positioning context for the absolutely-positioned rows.

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: completes with no errors; `dist/strata.css` is regenerated.

- [ ] **Step 3: Commit**

```bash
git add src/strata.css
git commit -m "style: scroll container and virtualization layout"
```

---

## Task 8: Demonstrate virtualization in the playground & final verification

**Files:**
- Modify: `playground/App.tsx`

- [ ] **Step 1: Replace `playground/App.tsx` entirely**

```tsx
import { DataGrid, type ColumnDef } from '../src/index';
import '../src/strata.css';

/**
 * Throwaway dev playground for Strata.
 * The full examples app is Plan 7 in docs/roadmap.md.
 */

interface BomRow {
  id: string;
  material: string;
  description: string;
  qty: number;
  uom: string;
  type: 'FERT' | 'HALB' | 'ROH';
}

const TYPES: BomRow['type'][] = ['FERT', 'HALB', 'ROH'];
const UOMS = ['EA', 'M', 'KG', 'SET', 'KIT'];

function makeRows(count: number): BomRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    material: `MAT-${String(i + 1).padStart(5, '0')}`,
    description: `Component ${i + 1}`,
    qty: (i % 9) + 1,
    uom: UOMS[i % UOMS.length],
    type: TYPES[i % TYPES.length],
  }));
}

const data = makeRows(2000);

const typeColor: Record<BomRow['type'], string> = {
  FERT: '#0a84ff',
  HALB: '#ff9f0a',
  ROH: '#86868b',
};

const columns: ColumnDef<BomRow>[] = [
  { id: 'material', header: 'Material', accessor: 'material', width: 160 },
  { id: 'description', header: 'Description', accessor: 'description', width: 240 },
  { id: 'qty', header: 'Qty', accessor: 'qty', width: 80 },
  { id: 'uom', header: 'UoM', accessor: 'uom', width: 70 },
  {
    id: 'type',
    header: 'Type',
    accessor: 'type',
    width: 110,
    cell: ({ value }) => (
      <span
        style={{
          background: typeColor[value as BomRow['type']],
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 4,
        }}
      >
        {String(value)}
      </span>
    ),
  },
];

export function App() {
  return (
    <div style={{ padding: 32, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Strata — Plan 2 Playground</h1>
      <p style={{ color: '#86868b', fontSize: 14, margin: '0 0 20px' }}>
        Row virtualization · 2,000 rows · only the visible window is in the DOM
      </p>
      <DataGrid data={data} columns={columns} height={520} />
    </div>
  );
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS — 28 tests, 7 files.

- [ ] **Step 3: Run the type check**

Run: `npm run typecheck`
Expected: completes with no errors.

- [ ] **Step 4: Run the build**

Run: `npm run build`
Expected: completes with no errors; `dist/` contains `index.js`, `index.cjs`, `index.d.ts`, `index.d.cts`, `strata.css`.

- [ ] **Step 5: Commit**

```bash
git add playground/App.tsx
git commit -m "chore: demo virtualization in the playground"
```

---

## Done — what Plan 2 delivers

The grid body is a fixed-height scroll container that renders only the visible window of rows (plus overscan) — a 2,000-row playground and the test suite both confirm only a few dozen rows are ever in the DOM, while the scrollbar reflects the full dataset. `DataGrid` gains an optional `height` prop. 28 tests pass; the build is clean.

**Next:** Plan 3 — Tree data (flat/nested normalization, expand/collapse, `TreeCell` with indenting).
