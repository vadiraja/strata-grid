# Strata M1 · Plan 1 — Foundation & Flat Grid · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Strata repository and build a working `<DataGrid>` that renders columns and rows from a plain `data` array.

**Architecture:** A single npm package. TanStack Table v8 provides the headless table model; Strata provides all rendering. Each public `ColumnDef` is mapped to a TanStack column that carries the original definition in its `meta.strataColumn`. React components render headers, rows, and cells from the TanStack table instance. Data enters through an `InMemoryDataSource`, satisfying the `DataSource` seam from the spec.

**Tech Stack:** TypeScript, React 18/19, `@tanstack/react-table` v8, tsup (build), Vitest + React Testing Library (tests).

**Spec:** `docs/superpowers/specs/2026-05-21-strata-tree-data-grid-design.md` — this plan implements the M1 foundation (flat rendering); virtualization, tree data, sorting/filtering, column features, selection/grouping, and theming/release follow in Plans 2–7.

---

## File Structure

Tests are **co-located** next to the code they cover (`*.test.ts` / `*.test.tsx`). This refines the spec's illustrative `tests/` folder — files that change together live together, and co-located tests are excluded from the published package because only `dist/` ships.

| File | Responsibility |
|---|---|
| `package.json` | Package metadata, scripts, dependencies |
| `tsconfig.json` | TypeScript compiler configuration |
| `tsup.config.ts` | Library build configuration |
| `vitest.config.ts` / `vitest.setup.ts` | Test runner configuration |
| `src/model/types.ts` | `ColumnDef`, `CellContext`; TanStack `ColumnMeta` augmentation |
| `src/model/constants.ts` | Default sizing constants |
| `src/model/read-value.ts` | Pure helper: read a column value from a row |
| `src/model/use-grid-table.ts` | Hook: map Strata columns → TanStack table instance |
| `src/data/data-source.ts` | `DataSource` interface |
| `src/data/in-memory-data-source.ts` | `InMemoryDataSource` implementation |
| `src/components/DataGrid.tsx` | Public component |
| `src/components/GridRoot.tsx` | Layout shell |
| `src/components/HeaderArea.tsx` / `ColumnHeaderCell.tsx` | Header rendering |
| `src/components/BodyViewport.tsx` / `GridRow.tsx` / `DataCell.tsx` | Body rendering |
| `src/components/GridFooter.tsx` | Footer (row count) |
| `src/strata.css` | Structural styles |
| `src/index.ts` | Public API barrel |

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "strata-grid",
  "version": "0.0.0",
  "description": "Open-source React tree data grid for PLM bills of materials and enterprise data.",
  "license": "MIT",
  "type": "module",
  "sideEffects": ["*.css"],
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
      "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
    },
    "./styles.css": "./dist/strata.css"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup && cp src/strata.css dist/strata.css",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@tanstack/react-table": "^8.20.5"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "jsdom": "^26.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tsup": "^8.3.5",
    "typescript": "^5.7.2",
    "vitest": "^3.0.5"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: completes without errors; creates `node_modules/` and `package-lock.json`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: scaffold strata-grid package"
```

---

## Task 2: TypeScript configuration

**Files:**
- Create: `tsconfig.json`

- [ ] **Step 1: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "tsup.config.ts", "vitest.config.ts", "vitest.setup.ts"]
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: add TypeScript configuration"
```

---

## Task 3: Build & test tooling

**Files:**
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Create `tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';

// tsup automatically externalizes `dependencies` and `peerDependencies`
// (and their subpaths, e.g. `react/jsx-runtime`), so no `external` list
// is needed here.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
});
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: add build and test tooling"
```

---

## Task 4: Core types & constants

**Files:**
- Create: `src/model/types.ts`
- Create: `src/model/constants.ts`

- [ ] **Step 1: Create `src/model/constants.ts`**

```ts
/** Default column width in pixels, used when a column omits `width`. */
export const DEFAULT_COLUMN_WIDTH = 160;

/** Default minimum column width in pixels, used when a column omits `minWidth`. */
export const MIN_COLUMN_WIDTH = 48;
```

- [ ] **Step 2: Create `src/model/types.ts`**

```ts
import type { ReactNode } from 'react';
import type { RowData } from '@tanstack/react-table';

/** Context passed to a custom cell renderer. */
export interface CellContext<TRow> {
  /** The row's underlying data object. */
  row: TRow;
  /** The value for this cell, read via the column's accessor. */
  value: unknown;
  /** The column definition this cell belongs to. */
  column: ColumnDef<TRow>;
  /** Zero-based index of the row in the current row model. */
  rowIndex: number;
}

/**
 * Definition of a single grid column.
 *
 * Later milestones extend this interface with pinning, sorting, filtering,
 * and tree-column options.
 */
export interface ColumnDef<TRow> {
  /** Unique, stable column id. */
  id: string;
  /** Header content — a string or any React node. */
  header: string | ReactNode;
  /**
   * How to read this column's value from a row: a key of `TRow`, or a
   * function. When omitted, `id` is used as the key.
   */
  accessor?: keyof TRow | ((row: TRow) => unknown);
  /** Custom cell renderer. Receives cell context, returns React content. */
  cell?: (context: CellContext<TRow>) => ReactNode;
  /** Fixed column width in pixels. Defaults to `DEFAULT_COLUMN_WIDTH`. */
  width?: number;
  /** Minimum column width in pixels. Defaults to `MIN_COLUMN_WIDTH`. */
  minWidth?: number;
}

/**
 * Augments TanStack's `ColumnMeta` so every TanStack column carries the
 * original Strata column definition.
 */
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    strataColumn: ColumnDef<TData>;
  }
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add core column types and sizing constants"
```

---

## Task 5: `readValue` helper

**Files:**
- Create: `src/model/read-value.ts`
- Test: `src/model/read-value.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/model/read-value.test.ts`:

```ts
import { readValue } from './read-value';
import type { ColumnDef } from './types';

interface Material {
  id: string;
  name: string;
  qty: number;
}

const row: Material = { id: 'M-1', name: 'Bolt', qty: 12 };

describe('readValue', () => {
  it('reads via a key accessor', () => {
    const column: ColumnDef<Material> = { id: 'name', header: 'Name', accessor: 'name' };
    expect(readValue(column, row)).toBe('Bolt');
  });

  it('reads via a function accessor', () => {
    const column: ColumnDef<Material> = {
      id: 'label',
      header: 'Label',
      accessor: (r) => `${r.name} (${r.qty})`,
    };
    expect(readValue(column, row)).toBe('Bolt (12)');
  });

  it('falls back to the column id when no accessor is given', () => {
    const column: ColumnDef<Material> = { id: 'qty', header: 'Qty' };
    expect(readValue(column, row)).toBe(12);
  });

  it('returns undefined when the accessor yields nothing', () => {
    const column: ColumnDef<Material> = {
      id: 'missing',
      header: 'Missing',
      accessor: () => undefined,
    };
    expect(readValue(column, row)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/model/read-value.test.ts`
Expected: FAIL — cannot resolve module `./read-value`.

- [ ] **Step 3: Write the implementation**

Create `src/model/read-value.ts`:

```ts
import type { ColumnDef } from './types';

/**
 * Reads a column's value from a row.
 *
 * - If `accessor` is a function, it is called with the row.
 * - If `accessor` is a key, that property is read.
 * - If `accessor` is omitted, the column `id` is used as the key.
 */
export function readValue<TRow>(column: ColumnDef<TRow>, row: TRow): unknown {
  const { accessor, id } = column;
  if (typeof accessor === 'function') {
    return accessor(row);
  }
  if (accessor !== undefined) {
    return row[accessor];
  }
  return (row as Record<string, unknown>)[id];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/model/read-value.test.ts`
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add readValue column accessor helper"
```

---

## Task 6: `DataSource` & `InMemoryDataSource`

**Files:**
- Create: `src/data/data-source.ts`
- Create: `src/data/in-memory-data-source.ts`
- Test: `src/data/in-memory-data-source.test.ts`

- [ ] **Step 1: Create the `DataSource` interface**

Create `src/data/data-source.ts`:

```ts
/**
 * Abstraction over the grid's data backend.
 *
 * M1 ships `InMemoryDataSource`. Later milestones add server-side
 * implementations behind this same interface.
 */
export interface DataSource<TRow> {
  /** Returns all rows. Synchronous for in-memory; may be async for servers. */
  load(): TRow[] | Promise<TRow[]>;
  /**
   * Optional. Registers a listener for external data changes and returns an
   * unsubscribe function.
   */
  subscribe?(onChange: () => void): () => void;
}
```

- [ ] **Step 2: Write the failing test**

Create `src/data/in-memory-data-source.test.ts`:

```ts
import { InMemoryDataSource } from './in-memory-data-source';

describe('InMemoryDataSource', () => {
  it('load() returns the rows it was constructed with', () => {
    const source = new InMemoryDataSource([{ id: 1 }, { id: 2 }]);
    expect(source.load()).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('setRows() replaces the rows', () => {
    const source = new InMemoryDataSource([{ id: 1 }]);
    source.setRows([{ id: 9 }]);
    expect(source.load()).toEqual([{ id: 9 }]);
  });

  it('setRows() notifies subscribers', () => {
    const source = new InMemoryDataSource([{ id: 1 }]);
    let calls = 0;
    source.subscribe(() => {
      calls += 1;
    });
    source.setRows([{ id: 2 }]);
    expect(calls).toBe(1);
  });

  it('the unsubscribe function stops notifications', () => {
    const source = new InMemoryDataSource([{ id: 1 }]);
    let calls = 0;
    const unsubscribe = source.subscribe(() => {
      calls += 1;
    });
    unsubscribe();
    source.setRows([{ id: 2 }]);
    expect(calls).toBe(0);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/data/in-memory-data-source.test.ts`
Expected: FAIL — cannot resolve module `./in-memory-data-source`.

- [ ] **Step 4: Write the implementation**

Create `src/data/in-memory-data-source.ts`:

```ts
import type { DataSource } from './data-source';

/** A {@link DataSource} backed by an in-memory array of rows. */
export class InMemoryDataSource<TRow> implements DataSource<TRow> {
  private rows: TRow[];
  private readonly listeners = new Set<() => void>();

  constructor(rows: TRow[]) {
    this.rows = rows;
  }

  /** Returns the current rows. */
  load(): TRow[] {
    return this.rows;
  }

  /** Replaces the backing rows and notifies all subscribers. */
  setRows(rows: TRow[]): void {
    this.rows = rows;
    for (const listener of this.listeners) {
      listener();
    }
  }

  /** Registers a change listener. Returns an unsubscribe function. */
  subscribe(onChange: () => void): () => void {
    this.listeners.add(onChange);
    return () => {
      this.listeners.delete(onChange);
    };
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/data/in-memory-data-source.test.ts`
Expected: PASS — 4 tests passing.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add DataSource interface and InMemoryDataSource"
```

---

## Task 7: `useGridTable` hook

**Files:**
- Create: `src/model/use-grid-table.ts`
- Test: `src/model/use-grid-table.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/model/use-grid-table.test.ts`:

```ts
import { renderHook } from '@testing-library/react';
import { useGridTable } from './use-grid-table';
import type { ColumnDef } from './types';

interface Material {
  id: string;
  name: string;
  qty: number;
}

const data: Material[] = [
  { id: 'M-1', name: 'Bolt', qty: 12 },
  { id: 'M-2', name: 'Nut', qty: 8 },
];

const columns: ColumnDef<Material>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'qty', header: 'Qty', accessor: 'qty' },
];

describe('useGridTable', () => {
  it('builds a table with one row per data item', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    expect(result.current.getRowModel().rows).toHaveLength(2);
  });

  it('builds a table with one column per column def', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    expect(result.current.getAllColumns()).toHaveLength(2);
  });

  it('exposes cell values through the column accessors', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    const firstRow = result.current.getRowModel().rows[0];
    const values = firstRow.getVisibleCells().map((cell) => cell.getValue());
    expect(values).toEqual(['Bolt', 12]);
  });

  it('carries the Strata column on each column meta', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    const meta = result.current.getAllColumns()[0].columnDef.meta;
    expect(meta?.strataColumn.id).toBe('name');
  });

  it('applies the default width to columns without an explicit width', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    expect(result.current.getAllColumns()[0].getSize()).toBe(160);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/model/use-grid-table.test.ts`
Expected: FAIL — cannot resolve module `./use-grid-table`.

- [ ] **Step 3: Write the implementation**

Create `src/model/use-grid-table.ts`:

```ts
import { useMemo } from 'react';
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef as TanstackColumnDef,
  type Table,
} from '@tanstack/react-table';
import type { ColumnDef } from './types';
import { readValue } from './read-value';
import { DEFAULT_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from './constants';

export interface UseGridTableOptions<TRow> {
  /** The rows to display. */
  data: TRow[];
  /** The column definitions. */
  columns: ColumnDef<TRow>[];
}

/**
 * Builds a TanStack Table instance from Strata column definitions.
 * Each Strata column is carried on its TanStack column via `meta.strataColumn`.
 */
export function useGridTable<TRow>(
  options: UseGridTableOptions<TRow>,
): Table<TRow> {
  const { data, columns } = options;

  const tanstackColumns = useMemo<TanstackColumnDef<TRow>[]>(
    () =>
      columns.map((column) => ({
        id: column.id,
        accessorFn: (row: TRow) => readValue(column, row),
        size: column.width ?? DEFAULT_COLUMN_WIDTH,
        minSize: column.minWidth ?? MIN_COLUMN_WIDTH,
        meta: { strataColumn: column },
      })),
    [columns],
  );

  return useReactTable<TRow>({
    data,
    columns: tanstackColumns,
    getCoreRowModel: getCoreRowModel(),
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/model/use-grid-table.test.ts`
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add useGridTable hook wiring TanStack Table"
```

---

## Task 8: Render slice — DataGrid, GridRoot, BodyViewport, GridRow, DataCell

This task builds the first end-to-end vertical slice: a `<DataGrid>` that renders body rows and cells (no header or footer yet).

**Files:**
- Create: `src/components/DataCell.tsx`
- Create: `src/components/GridRow.tsx`
- Create: `src/components/BodyViewport.tsx`
- Create: `src/components/GridRoot.tsx`
- Create: `src/components/DataGrid.tsx`
- Test: `src/components/DataGrid.rows.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/DataGrid.rows.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Material {
  id: string;
  name: string;
  qty: number;
}

const data: Material[] = [
  { id: 'M-1', name: 'Bolt', qty: 12 },
  { id: 'M-2', name: 'Nut', qty: 8 },
];

const columns: ColumnDef<Material>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'qty', header: 'Qty', accessor: 'qty' },
];

describe('DataGrid — rows and cells', () => {
  it('renders a grid container', () => {
    render(<DataGrid data={data} columns={columns} />);
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('renders one gridcell per row per column', () => {
    render(<DataGrid data={data} columns={columns} />);
    expect(screen.getAllByRole('gridcell')).toHaveLength(4);
  });

  it('renders each cell value', () => {
    render(<DataGrid data={data} columns={columns} />);
    expect(screen.getByText('Bolt')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Nut')).toBeInTheDocument();
  });

  it('uses a custom cell renderer when provided', () => {
    const withRenderer: ColumnDef<Material>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: 'name',
        cell: ({ value }) => <strong>{`* ${String(value)}`}</strong>,
      },
    ];
    render(<DataGrid data={data} columns={withRenderer} />);
    expect(screen.getByText('* Bolt')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/DataGrid.rows.test.tsx`
Expected: FAIL — cannot resolve module `./DataGrid`.

- [ ] **Step 3: Create `src/components/DataCell.tsx`**

```tsx
import type { Cell } from '@tanstack/react-table';
import type { ReactNode } from 'react';

export interface DataCellProps<TRow> {
  /** The TanStack cell to render. */
  cell: Cell<TRow, unknown>;
}

/** Renders a single body cell, delegating to the column's custom renderer. */
export function DataCell<TRow>({ cell }: DataCellProps<TRow>) {
  const strataColumn = cell.column.columnDef.meta!.strataColumn;
  const value = cell.getValue();
  const width = cell.column.getSize();

  let content: ReactNode;
  if (strataColumn.cell) {
    content = strataColumn.cell({
      row: cell.row.original,
      value,
      column: strataColumn,
      rowIndex: cell.row.index,
    });
  } else {
    content = value == null ? '' : String(value);
  }

  return (
    <div className="strata-cell" role="gridcell" style={{ width }}>
      {content}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/GridRow.tsx`**

```tsx
import type { Row } from '@tanstack/react-table';
import { DataCell } from './DataCell';

export interface GridRowProps<TRow> {
  /** The TanStack row to render. */
  row: Row<TRow>;
}

/** Renders one body row as a horizontal strip of cells. */
export function GridRow<TRow>({ row }: GridRowProps<TRow>) {
  return (
    <div className="strata-row" role="row">
      {row.getVisibleCells().map((cell) => (
        <DataCell key={cell.id} cell={cell} />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/BodyViewport.tsx`**

```tsx
import type { Table } from '@tanstack/react-table';
import { GridRow } from './GridRow';

export interface BodyViewportProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
}

/** Renders the grid body — one GridRow per row. */
export function BodyViewport<TRow>({ table }: BodyViewportProps<TRow>) {
  const rows = table.getRowModel().rows;
  return (
    <div className="strata-body" role="rowgroup">
      {rows.map((row) => (
        <GridRow key={row.id} row={row} />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create `src/components/GridRoot.tsx`**

```tsx
import type { Table } from '@tanstack/react-table';
import { BodyViewport } from './BodyViewport';

export interface GridRootProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
}

/** The grid layout shell. */
export function GridRoot<TRow>({ table }: GridRootProps<TRow>) {
  return (
    <div className="strata-grid" role="grid">
      <BodyViewport table={table} />
    </div>
  );
}
```

- [ ] **Step 7: Create `src/components/DataGrid.tsx`**

```tsx
import { useMemo } from 'react';
import type { ColumnDef } from '../model/types';
import { useGridTable } from '../model/use-grid-table';
import { InMemoryDataSource } from '../data/in-memory-data-source';
import { GridRoot } from './GridRoot';

export interface DataGridProps<TRow> {
  /** The rows to display. */
  data: TRow[];
  /** The column definitions. */
  columns: ColumnDef<TRow>[];
}

/** The public Strata grid component. */
export function DataGrid<TRow>({ data, columns }: DataGridProps<TRow>) {
  const dataSource = useMemo(() => new InMemoryDataSource(data), [data]);
  const rows = dataSource.load();
  const table = useGridTable({ data: rows, columns });
  return <GridRoot table={table} />;
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run src/components/DataGrid.rows.test.tsx`
Expected: PASS — 4 tests passing.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: render data rows and cells in DataGrid"
```

---

## Task 9: Column headers

Adds `HeaderArea` and `ColumnHeaderCell`, and wires the header into `GridRoot`.

**Files:**
- Create: `src/components/ColumnHeaderCell.tsx`
- Create: `src/components/HeaderArea.tsx`
- Modify: `src/components/GridRoot.tsx`
- Test: `src/components/DataGrid.header.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/DataGrid.header.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Material {
  id: string;
  name: string;
  qty: number;
}

const data: Material[] = [{ id: 'M-1', name: 'Bolt', qty: 12 }];

const columns: ColumnDef<Material>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'qty', header: 'Qty', accessor: 'qty' },
];

describe('DataGrid — column headers', () => {
  it('renders one column header per column', () => {
    render(<DataGrid data={data} columns={columns} />);
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
  });

  it('renders the header text', () => {
    render(<DataGrid data={data} columns={columns} />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Qty' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/DataGrid.header.test.tsx`
Expected: FAIL — no elements with role `columnheader`.

- [ ] **Step 3: Create `src/components/ColumnHeaderCell.tsx`**

```tsx
import type { Header } from '@tanstack/react-table';

export interface ColumnHeaderCellProps<TRow> {
  /** The TanStack header to render. */
  header: Header<TRow, unknown>;
}

/** Renders a single column header cell. */
export function ColumnHeaderCell<TRow>({ header }: ColumnHeaderCellProps<TRow>) {
  const strataColumn = header.column.columnDef.meta!.strataColumn;
  const width = header.getSize();
  return (
    <div className="strata-header-cell" role="columnheader" style={{ width }}>
      {strataColumn.header}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/HeaderArea.tsx`**

```tsx
import type { Table } from '@tanstack/react-table';
import { ColumnHeaderCell } from './ColumnHeaderCell';

export interface HeaderAreaProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
}

/** Renders the grid header — one row of column header cells. */
export function HeaderArea<TRow>({ table }: HeaderAreaProps<TRow>) {
  return (
    <div className="strata-header" role="rowgroup">
      {table.getHeaderGroups().map((headerGroup) => (
        <div className="strata-header-row" role="row" key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <ColumnHeaderCell key={header.id} header={header} />
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Replace `src/components/GridRoot.tsx`**

```tsx
import type { Table } from '@tanstack/react-table';
import { HeaderArea } from './HeaderArea';
import { BodyViewport } from './BodyViewport';

export interface GridRootProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
}

/** The grid layout shell. */
export function GridRoot<TRow>({ table }: GridRootProps<TRow>) {
  return (
    <div className="strata-grid" role="grid">
      <HeaderArea table={table} />
      <BodyViewport table={table} />
    </div>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/components/DataGrid.header.test.tsx`
Expected: PASS — 2 tests passing.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: render column headers"
```

---

## Task 10: Footer & empty state

Adds `GridFooter`, wires it into `GridRoot`, and adds the empty-data message to `BodyViewport`.

**Files:**
- Create: `src/components/GridFooter.tsx`
- Modify: `src/components/BodyViewport.tsx`
- Modify: `src/components/GridRoot.tsx`
- Test: `src/components/DataGrid.footer.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/DataGrid.footer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Material {
  id: string;
  name: string;
  qty: number;
}

const columns: ColumnDef<Material>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
];

describe('DataGrid — footer and empty state', () => {
  it('shows the row count in the footer', () => {
    const data: Material[] = [
      { id: 'M-1', name: 'Bolt', qty: 1 },
      { id: 'M-2', name: 'Nut', qty: 2 },
    ];
    render(<DataGrid data={data} columns={columns} />);
    expect(screen.getByText('2 rows')).toBeInTheDocument();
  });

  it('uses the singular form for a single row', () => {
    render(<DataGrid data={[{ id: 'M-1', name: 'Bolt', qty: 1 }]} columns={columns} />);
    expect(screen.getByText('1 row')).toBeInTheDocument();
  });

  it('shows an empty message when there is no data', () => {
    render(<DataGrid data={[]} columns={columns} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('shows 0 rows in the footer when empty', () => {
    render(<DataGrid data={[]} columns={columns} />);
    expect(screen.getByText('0 rows')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/DataGrid.footer.test.tsx`
Expected: FAIL — no element with text `2 rows`.

- [ ] **Step 3: Create `src/components/GridFooter.tsx`**

```tsx
export interface GridFooterProps {
  /** Number of rows currently shown. */
  rowCount: number;
}

/** Renders the grid footer with the current row count. */
export function GridFooter({ rowCount }: GridFooterProps) {
  return (
    <div className="strata-footer">
      <span className="strata-footer-count">
        {rowCount} {rowCount === 1 ? 'row' : 'rows'}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Replace `src/components/BodyViewport.tsx`**

```tsx
import type { Table } from '@tanstack/react-table';
import { GridRow } from './GridRow';

export interface BodyViewportProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
}

/** Renders the grid body — one GridRow per row, or an empty message. */
export function BodyViewport<TRow>({ table }: BodyViewportProps<TRow>) {
  const rows = table.getRowModel().rows;

  if (rows.length === 0) {
    return (
      <div className="strata-body strata-body-empty" role="rowgroup">
        <div className="strata-empty">No data</div>
      </div>
    );
  }

  return (
    <div className="strata-body" role="rowgroup">
      {rows.map((row) => (
        <GridRow key={row.id} row={row} />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Replace `src/components/GridRoot.tsx`**

```tsx
import type { Table } from '@tanstack/react-table';
import { HeaderArea } from './HeaderArea';
import { BodyViewport } from './BodyViewport';
import { GridFooter } from './GridFooter';

export interface GridRootProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
}

/** The grid layout shell. */
export function GridRoot<TRow>({ table }: GridRootProps<TRow>) {
  return (
    <div className="strata-grid" role="grid">
      <HeaderArea table={table} />
      <BodyViewport table={table} />
      <GridFooter rowCount={table.getRowModel().rows.length} />
    </div>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/components/DataGrid.footer.test.tsx`
Expected: PASS — 4 tests passing.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add grid footer row count and empty state"
```

---

## Task 11: Structural CSS, public barrel & build verification

**Files:**
- Create: `src/strata.css`
- Create: `src/index.ts`

- [ ] **Step 1: Create `src/strata.css`**

These are structural styles only. Plan 7 replaces the hard-coded colours with CSS custom properties for full theming.

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
  display: flex;
  flex-direction: column;
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

- [ ] **Step 2: Create `src/index.ts`**

```ts
export { DataGrid } from './components/DataGrid';
export type { DataGridProps } from './components/DataGrid';
export type { ColumnDef, CellContext } from './model/types';
export { InMemoryDataSource } from './data/in-memory-data-source';
export type { DataSource } from './data/data-source';
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS — all test files pass (read-value, in-memory-data-source, use-grid-table, DataGrid.rows, DataGrid.header, DataGrid.footer).

- [ ] **Step 4: Run the type check**

Run: `npm run typecheck`
Expected: completes with no errors.

- [ ] **Step 5: Run the build**

Run: `npm run build`
Expected: completes with no errors; `dist/` contains `index.js`, `index.cjs`, `index.d.ts`, `index.d.cts`, and `strata.css`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add structural styles and public API barrel"
```

---

## Done — what Plan 1 delivers

A published-shape `strata-grid` package exporting a working `<DataGrid>` that renders columns, rows, cells (with custom renderers), headers, a footer row count, and an empty state — all from a plain `data` array, fed through `InMemoryDataSource` and modelled by TanStack Table. Fully type-checked, built, and covered by unit and component tests.

**Next:** Plan 2 — Virtualization (row + column windowing via TanStack Virtual).
