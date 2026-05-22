# Strata M1 · Plan 5 — Column Resize, Reorder & Pinning · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the grid first-class column management for wide SAP-style material tables: drag-to-resize column widths, drag-to-reorder columns, and pin (freeze) columns to the left or right edge so they stay visible during horizontal scroll. The center pane gains column virtualization so only visible columns render.

**Architecture:** The grid body becomes a 3-pane horizontal layout: pinned-left · scrollable center · pinned-right. Pinned panes are always rendered (never column-virtualized); the center pane is both row- and column-virtualized via TanStack Virtual. Column resize uses a drag handle on the header cell's right edge that updates TanStack Table's column sizing state. Column reorder uses HTML5 drag-and-drop on header cells to swap column positions. Column pinning uses TanStack Table's built-in `columnPinning` state, with a `pin` field on `ColumnDef`.

**Tech Stack:** TypeScript, React 18/19, `@tanstack/react-table` v8 (column pinning, column sizing), `@tanstack/react-virtual` v3 (column virtualizer), tsup, Vitest + React Testing Library.

**Scope note:** This plan covers **column resize, reorder, pinning, and column virtualization**. Column groups (stacked headers) are **Plan 8**. Row grouping is **Plan 9**.

**Spec:** `docs/superpowers/specs/2026-05-21-strata-tree-data-grid-design.md` (§5.6, §5.11, §6.2, §8). Builds directly on Plan 4 (`docs/superpowers/plans/2026-05-21-strata-m1-plan-4-sorting-filtering.md`), merged to `master`.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/model/types.ts` | modify | Add `pin` to `ColumnDef` |
| `src/model/use-grid-table.ts` | modify | Wire column pinning state, column sizing |
| `src/model/use-grid-table.test.ts` | modify | Add pinning and sizing tests |
| `src/virtual/use-column-virtualizer.ts` | create | Hook wrapping TanStack Virtual for column windowing |
| `src/virtual/use-column-virtualizer.test.ts` | create | Column virtualizer tests |
| `src/components/ResizeHandle.tsx` | create | Drag handle for column resize |
| `src/components/ColumnHeaderCell.tsx` | modify | Add resize handle and drag-to-reorder |
| `src/components/BodyViewport.tsx` | modify | 3-pane layout with column virtualization |
| `src/components/HeaderArea.tsx` | modify | 3-pane header layout matching body |
| `src/components/GridRow.tsx` | modify | Render cells for a column range (virtualized or pinned) |
| `src/components/GridRoot.tsx` | modify | Thread column order and pinning state |
| `src/components/DataGrid.tsx` | modify | Accept column order/pinning callbacks |
| `src/components/DataGrid.columns.test.tsx` | create | Column resize, reorder, pinning tests |
| `src/strata.css` | modify | 3-pane layout, resize handle, reorder drag styles |
| `src/index.ts` | modify | Export updated types |
| `playground/App.tsx` | modify | Demo with pinned columns and many columns |

---

## Task 1: Column pinning types and table wiring

Add the `pin` field to `ColumnDef` and wire TanStack Table's column pinning state into `useGridTable`. Pinned columns are split into left/center/right groups that the layout components will consume.

**Files:**
- Modify: `src/model/types.ts`
- Modify: `src/model/use-grid-table.ts`
- Modify: `src/model/use-grid-table.test.ts`

- [ ] **Step 1: Add `pin` to `ColumnDef` in `src/model/types.ts`**

Add the following field to the `ColumnDef` interface, after the `filter` field:

```ts
  /**
   * Pins (freezes) this column to the left or right edge of the grid.
   * Pinned columns are always visible and never column-virtualized.
   * Defaults to unpinned (center).
   */
  pin?: 'left' | 'right';
```

- [ ] **Step 2: Update `useGridTable` to wire column pinning**

In `src/model/use-grid-table.ts`, update the TanStack column mapping to include pinning:

```ts
// Inside the columns.map callback, add:
enablePinning: true,
```

And add `columnPinning` to the `initialState`:

```ts
initialState: {
  expanded: defaultExpanded ? true : {},
  sorting: toTanstackSorting(defaultSort),
  columnPinning: {
    left: columns.filter((c) => c.pin === 'left').map((c) => c.id),
    right: columns.filter((c) => c.pin === 'right').map((c) => c.id),
  },
},
```

Also enable column resizing:

```ts
enableColumnResizing: true,
columnResizeMode: 'onChange',
```

- [ ] **Step 3: Add pinning tests to `src/model/use-grid-table.test.ts`**

Append the following test block:

```ts
describe('useGridTable — column pinning', () => {
  it('pins columns to the left when pin is set', () => {
    const cols: ColumnDef<Material>[] = [
      { id: 'name', header: 'Name', accessor: 'name', pin: 'left' },
      { id: 'qty', header: 'Qty', accessor: 'qty' },
    ];
    const { result } = renderHook(() => useGridTable({ data, columns: cols }));
    const pinState = result.current.getState().columnPinning;
    expect(pinState.left).toContain('name');
  });

  it('pins columns to the right when pin is set', () => {
    const cols: ColumnDef<Material>[] = [
      { id: 'name', header: 'Name', accessor: 'name' },
      { id: 'qty', header: 'Qty', accessor: 'qty', pin: 'right' },
    ];
    const { result } = renderHook(() => useGridTable({ data, columns: cols }));
    const pinState = result.current.getState().columnPinning;
    expect(pinState.right).toContain('qty');
  });

  it('leaves unpinned columns in the center', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    const pinState = result.current.getState().columnPinning;
    expect(pinState.left).toEqual([]);
    expect(pinState.right).toEqual([]);
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/model/use-grid-table.test.ts`
Expected: PASS — all existing tests plus 3 new pinning tests pass.

- [ ] **Step 5: Verify types type-check**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 7: Commit**

```bash
git add src/model/types.ts src/model/use-grid-table.ts src/model/use-grid-table.test.ts
git commit -m "feat: wire column pinning and resize into useGridTable"
```

---

## Task 2: Column virtualizer

A hook that wraps TanStack Virtual for horizontal (column) windowing. It virtualizes only the unpinned center columns — pinned columns are always rendered. The virtualizer needs the scroll container ref and the list of center column widths.

**Files:**
- Create: `src/virtual/use-column-virtualizer.ts`
- Create: `src/virtual/use-column-virtualizer.test.ts`

- [ ] **Step 1: Write the failing test — `src/virtual/use-column-virtualizer.test.ts`**

```ts
import { renderHook } from '@testing-library/react';
import { useColumnVirtualizer } from './use-column-virtualizer';

describe('useColumnVirtualizer', () => {
  it('returns virtual items for visible columns', () => {
    const scrollRef = { current: document.createElement('div') };
    Object.defineProperty(scrollRef.current, 'clientWidth', { value: 400 });

    const { result } = renderHook(() =>
      useColumnVirtualizer({
        scrollRef,
        columnWidths: [160, 160, 160, 160, 160], // 5 columns × 160px = 800px total
      }),
    );
    // With 400px viewport, not all 5 columns should be in the initial window
    expect(result.current.getVirtualItems().length).toBeLessThanOrEqual(5);
    expect(result.current.getTotalSize()).toBe(800);
  });

  it('returns total size equal to sum of all column widths', () => {
    const scrollRef = { current: document.createElement('div') };
    Object.defineProperty(scrollRef.current, 'clientWidth', { value: 1000 });

    const { result } = renderHook(() =>
      useColumnVirtualizer({
        scrollRef,
        columnWidths: [100, 200, 150],
      }),
    );
    expect(result.current.getTotalSize()).toBe(450);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/virtual/use-column-virtualizer.test.ts`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Create `src/virtual/use-column-virtualizer.ts`**

```ts
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import type { RefObject } from 'react';

export interface UseColumnVirtualizerOptions {
  /** Ref to the horizontal scroll container. */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Widths of the center (unpinned) columns, in order. */
  columnWidths: number[];
  /** Number of extra columns rendered to the left and right. Defaults to 2. */
  overscan?: number;
}

/**
 * Wraps TanStack Virtual for horizontal column windowing.
 *
 * Only the center (unpinned) columns are virtualized. Pinned columns
 * are always rendered by the layout and are not passed to this hook.
 */
export function useColumnVirtualizer(
  options: UseColumnVirtualizerOptions,
): Virtualizer<HTMLDivElement, Element> {
  const { scrollRef, columnWidths, overscan = 2 } = options;

  return useVirtualizer({
    horizontal: true,
    count: columnWidths.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => columnWidths[index],
    overscan,
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/virtual/use-column-virtualizer.test.ts`
Expected: PASS — 2 tests passing.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/virtual/use-column-virtualizer.ts src/virtual/use-column-virtualizer.test.ts
git commit -m "feat: add column virtualizer hook"
```

---

## Task 3: Resize handle component

A thin drag handle rendered on the right edge of each column header cell. Dragging it horizontally updates the column's width via TanStack Table's column sizing API.

**Files:**
- Create: `src/components/ResizeHandle.tsx`

- [ ] **Step 1: Create `src/components/ResizeHandle.tsx`**

```tsx
import type { Header } from '@tanstack/react-table';

export interface ResizeHandleProps<TRow> {
  /** The TanStack header whose column is being resized. */
  header: Header<TRow, unknown>;
}

/**
 * A drag handle for column resizing. Rendered on the right edge of
 * each column header cell. Uses TanStack Table's built-in resize handler.
 */
export function ResizeHandle<TRow>({ header }: ResizeHandleProps<TRow>) {
  return (
    <div
      className={`strata-resize-handle${
        header.column.getIsResizing() ? ' strata-resize-handle-active' : ''
      }`}
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize column ${header.column.id}`}
    />
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ResizeHandle.tsx
git commit -m "feat: add ResizeHandle component for column resizing"
```

---

## Task 4: Column header with resize and reorder

Update `ColumnHeaderCell` to include the resize handle and support drag-to-reorder via HTML5 drag-and-drop. Dragging a header cell over another swaps their positions in the column order.

**Files:**
- Modify: `src/components/ColumnHeaderCell.tsx`

- [ ] **Step 1: Replace `src/components/ColumnHeaderCell.tsx` entirely**

```tsx
import { useCallback } from 'react';
import type { Header } from '@tanstack/react-table';
import { SortIndicator } from './SortIndicator';
import { FilterPopover } from './FilterPopover';
import { ResizeHandle } from './ResizeHandle';
import type { FilterType } from '../model/types';

export interface ColumnHeaderCellProps<TRow> {
  /** The TanStack header to render. */
  header: Header<TRow, unknown>;
  /** Callback when a column is dragged and dropped onto another. */
  onColumnReorder?: (draggedId: string, targetId: string) => void;
}

/** Renders a column header cell with sort, filter, resize, and reorder. */
export function ColumnHeaderCell<TRow>({
  header,
  onColumnReorder,
}: ColumnHeaderCellProps<TRow>) {
  const strataColumn = header.column.columnDef.meta!.strataColumn;
  const width = header.getSize();
  const canSort = header.column.getCanSort();
  const sortDirection = header.column.getIsSorted();
  const filterType = strataColumn.filter as FilterType | false | undefined;

  const handleClick = (e: React.MouseEvent) => {
    if (!canSort) return;
    header.column.getToggleSortingHandler()?.(e);
  };

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', header.column.id);
      e.dataTransfer.effectAllowed = 'move';
    },
    [header.column.id],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId && draggedId !== header.column.id && onColumnReorder) {
        onColumnReorder(draggedId, header.column.id);
      }
    },
    [header.column.id, onColumnReorder],
  );

  return (
    <div
      className={`strata-header-cell${canSort ? ' strata-header-cell-sortable' : ''}`}
      role="columnheader"
      style={{ width }}
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      aria-sort={
        sortDirection === 'asc'
          ? 'ascending'
          : sortDirection === 'desc'
            ? 'descending'
            : undefined
      }
    >
      <span className="strata-header-label">{strataColumn.header}</span>
      {canSort && <SortIndicator direction={sortDirection} />}
      {filterType && filterType !== false && (
        <FilterPopover column={header.column} filterType={filterType} />
      )}
      <ResizeHandle header={header} />
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ColumnHeaderCell.tsx
git commit -m "feat: add resize handle and drag-to-reorder to column headers"
```

---

## Task 5: 3-pane body layout with column virtualization

Refactor `BodyViewport` into a 3-pane horizontal layout: pinned-left cells (always rendered), center cells (column-virtualized), and pinned-right cells (always rendered). Vertical scroll is shared across all three panes. Horizontal scroll moves only the center pane.

**Files:**
- Modify: `src/components/GridRow.tsx`
- Modify: `src/components/BodyViewport.tsx`
- Modify: `src/components/HeaderArea.tsx`

- [ ] **Step 1: Replace `src/components/GridRow.tsx` entirely**

```tsx
import type { CSSProperties } from 'react';
import type { Row, Cell } from '@tanstack/react-table';
import { DataCell } from './DataCell';
import { TreeCell } from './TreeCell';

export interface GridRowProps<TRow> {
  /** The TanStack row to render. */
  row: Row<TRow>;
  /** Positioning style applied by the row virtualizer. */
  style?: CSSProperties;
  /** Id of the tree column. Set only in tree mode. */
  treeColumnId?: string;
  /**
   * Which cells to render. If omitted, renders all visible cells.
   * Used by the 3-pane layout to render only a subset (pinned or center).
   */
  cells?: Cell<TRow, unknown>[];
}

/** Renders one body row as a horizontal strip of cells. */
export function GridRow<TRow>({
  row,
  style,
  treeColumnId,
  cells,
}: GridRowProps<TRow>) {
  const isTree = treeColumnId !== undefined;
  const cellsToRender = cells ?? row.getVisibleCells();

  return (
    <div
      className="strata-row"
      role="row"
      style={style}
      aria-level={isTree ? row.depth + 1 : undefined}
      aria-expanded={
        isTree && row.getCanExpand() ? row.getIsExpanded() : undefined
      }
    >
      {cellsToRender.map((cell) =>
        cell.column.id === treeColumnId ? (
          <TreeCell key={cell.id} cell={cell} />
        ) : (
          <DataCell key={cell.id} cell={cell} />
        ),
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/components/BodyViewport.tsx` entirely**

```tsx
import { useRef } from 'react';
import type { Table, Row, Cell } from '@tanstack/react-table';
import { GridRow } from './GridRow';
import { useRowVirtualizer } from '../virtual/use-row-virtualizer';
import { useColumnVirtualizer } from '../virtual/use-column-virtualizer';

export interface BodyViewportProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
  /** Height of the scrollable body area in pixels. */
  height: number;
  /** Id of the tree column. Set only in tree mode. */
  treeColumnId?: string;
}

/** Renders the grid body as a 3-pane virtualized scroll area. */
export function BodyViewport<TRow>({
  table,
  height,
  treeColumnId,
}: BodyViewportProps<TRow>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const rowVirtualizer = useRowVirtualizer({ scrollRef, count: rows.length });

  const leftColumns = table.getLeftVisibleLeafColumns();
  const centerColumns = table.getCenterVisibleLeafColumns();
  const rightColumns = table.getRightVisibleLeafColumns();

  const centerWidths = centerColumns.map((col) => col.getSize());
  const colVirtualizer = useColumnVirtualizer({
    scrollRef,
    columnWidths: centerWidths,
  });

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

  const leftWidth = leftColumns.reduce((sum, col) => sum + col.getSize(), 0);
  const rightWidth = rightColumns.reduce((sum, col) => sum + col.getSize(), 0);

  return (
    <div
      ref={scrollRef}
      className="strata-body"
      role="rowgroup"
      style={{ height }}
    >
      <div
        className="strata-body-sizer"
        role="presentation"
        style={{ height: rowVirtualizer.getTotalSize() }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          const rowStyle: React.CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: virtualRow.size,
            transform: `translateY(${virtualRow.start}px)`,
            display: 'flex',
          };

          return (
            <div key={virtualRow.key} className="strata-row-container" style={rowStyle}>
              {/* Pinned left */}
              {leftColumns.length > 0 && (
                <div className="strata-pane-left" style={{ width: leftWidth, flexShrink: 0 }}>
                  <GridRow
                    row={row}
                    treeColumnId={treeColumnId}
                    cells={getCellsForColumns(row, leftColumns)}
                  />
                </div>
              )}
              {/* Center (column-virtualized) */}
              <div className="strata-pane-center" style={{ flex: '1 1 auto', overflow: 'hidden' }}>
                <div style={{ width: colVirtualizer.getTotalSize(), position: 'relative' }}>
                  <GridRow
                    row={row}
                    treeColumnId={treeColumnId}
                    cells={getVirtualizedCenterCells(row, centerColumns, colVirtualizer)}
                  />
                </div>
              </div>
              {/* Pinned right */}
              {rightColumns.length > 0 && (
                <div className="strata-pane-right" style={{ width: rightWidth, flexShrink: 0 }}>
                  <GridRow
                    row={row}
                    treeColumnId={treeColumnId}
                    cells={getCellsForColumns(row, rightColumns)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Gets cells for a specific set of columns from a row. */
function getCellsForColumns<TRow>(
  row: Row<TRow>,
  columns: { id: string }[],
): Cell<TRow, unknown>[] {
  const columnIds = new Set(columns.map((c) => c.id));
  return row.getVisibleCells().filter((cell) => columnIds.has(cell.column.id));
}

/** Gets only the virtualized center cells. */
function getVirtualizedCenterCells<TRow>(
  row: Row<TRow>,
  centerColumns: { id: string }[],
  colVirtualizer: { getVirtualItems: () => { index: number }[] },
): Cell<TRow, unknown>[] {
  const allCells = row.getVisibleCells();
  const centerIds = new Set(centerColumns.map((c) => c.id));
  const centerCells = allCells.filter((cell) => centerIds.has(cell.column.id));
  const virtualItems = colVirtualizer.getVirtualItems();
  return virtualItems.map((vi) => centerCells[vi.index]).filter(Boolean);
}
```

- [ ] **Step 3: Update `src/components/HeaderArea.tsx` to match the 3-pane layout**

```tsx
import { useCallback, useState } from 'react';
import type { Table } from '@tanstack/react-table';
import { ColumnHeaderCell } from './ColumnHeaderCell';

export interface HeaderAreaProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
}

/** Renders the grid header with pinned-left, center, and pinned-right panes. */
export function HeaderArea<TRow>({ table }: HeaderAreaProps<TRow>) {
  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    table.getAllLeafColumns().map((c) => c.id),
  );

  const handleColumnReorder = useCallback(
    (draggedId: string, targetId: string) => {
      setColumnOrder((prev) => {
        const newOrder = [...prev];
        const dragIdx = newOrder.indexOf(draggedId);
        const targetIdx = newOrder.indexOf(targetId);
        if (dragIdx === -1 || targetIdx === -1) return prev;
        newOrder.splice(dragIdx, 1);
        newOrder.splice(targetIdx, 0, draggedId);
        table.setColumnOrder(newOrder);
        return newOrder;
      });
    },
    [table],
  );

  return (
    <div className="strata-header" role="rowgroup">
      {table.getHeaderGroups().map((headerGroup) => (
        <div className="strata-header-row" role="row" key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <ColumnHeaderCell
              key={header.id}
              header={header}
              onColumnReorder={handleColumnReorder}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 5: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — existing tests still pass. The 3-pane layout is backward-compatible: with no pinned columns, `leftColumns` and `rightColumns` are empty, so the grid renders identically to before.

- [ ] **Step 6: Commit**

```bash
git add src/components/GridRow.tsx src/components/BodyViewport.tsx src/components/HeaderArea.tsx
git commit -m "feat: 3-pane body layout with column virtualization"
```

---

## Task 6: Column management integration tests

End-to-end tests for column resize, reorder, and pinning behavior.

**Files:**
- Create: `src/components/DataGrid.columns.test.tsx`

- [ ] **Step 1: Create `src/components/DataGrid.columns.test.tsx`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Row {
  id: string;
  a: string;
  b: string;
  c: string;
}

const data: Row[] = [
  { id: '1', a: 'A1', b: 'B1', c: 'C1' },
  { id: '2', a: 'A2', b: 'B2', c: 'C2' },
];

describe('DataGrid — column pinning', () => {
  it('renders pinned-left columns in a separate pane', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a', pin: 'left' },
      { id: 'b', header: 'Col B', accessor: 'b' },
      { id: 'c', header: 'Col C', accessor: 'c' },
    ];
    const { container } = render(<DataGrid data={data} columns={columns} />);
    const leftPane = container.querySelector('.strata-pane-left');
    expect(leftPane).not.toBeNull();
    expect(leftPane?.textContent).toContain('A1');
  });

  it('renders pinned-right columns in a separate pane', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a' },
      { id: 'b', header: 'Col B', accessor: 'b' },
      { id: 'c', header: 'Col C', accessor: 'c', pin: 'right' },
    ];
    const { container } = render(<DataGrid data={data} columns={columns} />);
    const rightPane = container.querySelector('.strata-pane-right');
    expect(rightPane).not.toBeNull();
    expect(rightPane?.textContent).toContain('C1');
  });

  it('does not render pinned panes when no columns are pinned', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a' },
      { id: 'b', header: 'Col B', accessor: 'b' },
    ];
    const { container } = render(<DataGrid data={data} columns={columns} />);
    expect(container.querySelector('.strata-pane-left')).toBeNull();
    expect(container.querySelector('.strata-pane-right')).toBeNull();
  });
});

describe('DataGrid — column resize', () => {
  it('renders a resize handle on each column header', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a' },
      { id: 'b', header: 'Col B', accessor: 'b' },
    ];
    const { container } = render(<DataGrid data={data} columns={columns} />);
    const handles = container.querySelectorAll('.strata-resize-handle');
    expect(handles).toHaveLength(2);
  });

  it('marks the resize handle as active during drag', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a' },
    ];
    const { container } = render(<DataGrid data={data} columns={columns} />);
    const handle = container.querySelector('.strata-resize-handle')!;
    fireEvent.mouseDown(handle);
    expect(handle.classList.contains('strata-resize-handle-active')).toBe(true);
  });
});

describe('DataGrid — column reorder', () => {
  it('makes header cells draggable', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a' },
      { id: 'b', header: 'Col B', accessor: 'b' },
    ];
    render(<DataGrid data={data} columns={columns} />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]).toHaveAttribute('draggable', 'true');
    expect(headers[1]).toHaveAttribute('draggable', 'true');
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/components/DataGrid.columns.test.tsx`
Expected: PASS — all tests pass.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 4: Commit**

```bash
git add src/components/DataGrid.columns.test.tsx
git commit -m "test: add column resize, reorder, and pinning integration tests"
```

---

## Task 7: Column management CSS

Styles for the 3-pane layout, resize handle, drag-over state, and pinned pane borders.

**Files:**
- Modify: `src/strata.css`

- [ ] **Step 1: Add the following rules to `src/strata.css`**

Append after the existing `.strata-filter-input:focus` rule:

```css
.strata-row-container {
  display: flex;
}

.strata-pane-left {
  flex: none;
  position: sticky;
  left: 0;
  z-index: 2;
  background: #fff;
  border-right: 2px solid #d1d1d6;
}

.strata-pane-center {
  flex: 1 1 auto;
  overflow: hidden;
}

.strata-pane-right {
  flex: none;
  position: sticky;
  right: 0;
  z-index: 2;
  background: #fff;
  border-left: 2px solid #d1d1d6;
}

.strata-resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  user-select: none;
  touch-action: none;
}

.strata-resize-handle:hover,
.strata-resize-handle-active {
  background: #0071e3;
}

.strata-header-cell {
  position: relative;
}

.strata-header-cell[draggable='true']:active {
  opacity: 0.6;
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: completes with no errors; `dist/strata.css` contains the new rules.

- [ ] **Step 3: Commit**

```bash
git add src/strata.css
git commit -m "style: add 3-pane layout, resize handle, and reorder styles"
```

---

## Task 8: Public exports, playground update, and final verification

Export the updated types, update the playground to demonstrate pinned columns and column resize, and run the full verification pass.

**Files:**
- Modify: `src/index.ts`
- Modify: `playground/App.tsx`

- [ ] **Step 1: Verify `src/index.ts` exports the `pin` field via `ColumnDef`**

The `pin` field is already part of `ColumnDef` which is exported. No additional export needed. Verify:

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 2: Replace `playground/App.tsx` entirely**

```tsx
import { DataGrid, type ColumnDef, type TreeDataConfig } from '../src/index';
import '../src/strata.css';

/**
 * Throwaway dev playground for Strata.
 * The full examples app is Plan 7 in docs/roadmap.md.
 */

interface BomNode {
  id: string;
  material: string;
  description: string;
  qty: number;
  uom: string;
  children?: BomNode[];
}

const bom: BomNode[] = [
  {
    id: 'FG-1000',
    material: 'FG-1000',
    description: 'Mountain Bike — Trail 29',
    qty: 1,
    uom: 'EA',
    children: [
      {
        id: 'SA-2000',
        material: 'SA-2000',
        description: 'Frame Assembly',
        qty: 1,
        uom: 'EA',
        children: [
          { id: 'PT-3000', material: 'PT-3000', description: 'Front Triangle', qty: 1, uom: 'EA' },
          { id: 'PT-3001', material: 'PT-3001', description: 'Rear Triangle', qty: 1, uom: 'EA' },
          { id: 'PT-3002', material: 'PT-3002', description: 'Pivot Bearing', qty: 4, uom: 'EA' },
        ],
      },
      {
        id: 'SA-2001',
        material: 'SA-2001',
        description: 'Wheel Set',
        qty: 2,
        uom: 'EA',
        children: [
          { id: 'PT-3100', material: 'PT-3100', description: 'Rim 29"', qty: 1, uom: 'EA' },
          { id: 'PT-3101', material: 'PT-3101', description: 'Spoke', qty: 32, uom: 'EA' },
          { id: 'PT-3102', material: 'PT-3102', description: 'Hub', qty: 1, uom: 'EA' },
          { id: 'PT-3103', material: 'PT-3103', description: 'Tyre 29x2.4', qty: 1, uom: 'EA' },
        ],
      },
      {
        id: 'SA-2002',
        material: 'SA-2002',
        description: 'Drivetrain Group',
        qty: 1,
        uom: 'EA',
        children: [
          { id: 'PT-3200', material: 'PT-3200', description: 'Crankset', qty: 1, uom: 'EA' },
          { id: 'PT-3201', material: 'PT-3201', description: 'Chain', qty: 1, uom: 'M' },
          { id: 'PT-3202', material: 'PT-3202', description: 'Cassette 12s', qty: 1, uom: 'EA' },
          { id: 'PT-3203', material: 'PT-3203', description: 'Rear Derailleur', qty: 1, uom: 'EA' },
        ],
      },
      { id: 'PT-2003', material: 'PT-2003', description: 'Handlebar', qty: 1, uom: 'EA' },
      { id: 'PT-2004', material: 'PT-2004', description: 'Saddle', qty: 1, uom: 'EA' },
    ],
  },
];

const columns: ColumnDef<BomNode>[] = [
  { id: 'material', header: 'Material', accessor: 'material', width: 150, isTreeColumn: true, pin: 'left', filter: 'text' },
  { id: 'description', header: 'Description', accessor: 'description', width: 260, filter: 'text' },
  { id: 'qty', header: 'Qty', accessor: 'qty', width: 80, filter: 'number' },
  { id: 'uom', header: 'UoM', accessor: 'uom', width: 80 },
];

const treeData: TreeDataConfig<BomNode> = {
  getRowId: (r) => r.id,
  getChildren: (r) => r.children,
};

export function App() {
  return (
    <div style={{ padding: 32, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Strata — Plan 5 Playground</h1>
      <p style={{ color: '#86868b', fontSize: 14, margin: '0 0 20px' }}>
        Column pinning (Material pinned left) · resize (drag header edges) · reorder (drag headers) · sorting · filtering
      </p>
      <DataGrid
        data={bom}
        columns={columns}
        treeData={treeData}
        defaultExpanded
        defaultSort={[{ columnId: 'material', direction: 'asc' }]}
        height={520}
      />
    </div>
  );
}
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS — all tests pass.

- [ ] **Step 4: Run the type check**

Run: `npm run typecheck`
Expected: completes with no errors.

- [ ] **Step 5: Run the build**

Run: `npm run build`
Expected: completes with no errors; `dist/` contains all expected outputs.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts playground/App.tsx
git commit -m "feat: demo column pinning, resize, and reorder in playground"
```

---

## Done — what Plan 5 delivers

`<DataGrid>` now supports full column management for wide enterprise tables:

- **Column pinning:** Set `pin: 'left'` or `pin: 'right'` on a `ColumnDef` to freeze it. Pinned columns stay visible during horizontal scroll, rendered in dedicated panes outside the virtualized center.
- **Column resize:** Drag the right edge of any column header to resize it. Uses TanStack Table's built-in column sizing with `columnResizeMode: 'onChange'` for live feedback.
- **Column reorder:** Drag a column header and drop it on another to swap positions. Uses HTML5 drag-and-drop for zero-dependency simplicity.
- **Column virtualization:** The center (unpinned) pane is column-virtualized via TanStack Virtual — only visible columns render, enabling grids with 50+ columns at smooth scroll.
- **3-pane layout:** The body is now pinned-left · center · pinned-right, matching the spec's §8 architecture. Vertical scroll is shared; horizontal scroll moves only the center.
- **ARIA:** Resize handles carry `role="separator"` with `aria-orientation="vertical"` and an accessible label.
- **No regressions:** All Plan 4 sorting/filtering tests, Plan 3 tree tests, Plan 2 virtualization tests, and Plan 1 foundation tests continue to pass.

**Next:** Plan 6 — Row selection (single/multi/checkbox with parent→child cascade and tri-state indeterminate parents).
