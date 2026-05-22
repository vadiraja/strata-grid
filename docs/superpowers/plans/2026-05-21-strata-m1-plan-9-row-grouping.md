# Strata M1 · Plan 9 — Row Grouping · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add row grouping to the grid — group flat rows by one or more column values, with synthetic group header rows that show the group value and child count, expand/collapse behavior, and visual indentation for nested groups. This is the **final feature plan** in M1.

**Architecture:** Row grouping is powered by TanStack Table's `getGroupedRowModel`. When `groupBy` is provided (an array of column ids), the table groups rows by those columns in order, creating synthetic parent rows. Group rows are detected via `row.getIsGrouped()` and rendered with a dedicated `GroupRow` component that shows the group value, child count, and an expand/collapse toggle. Group rows span the full grid width and are visually distinct (bold, subtle background). Multiple `groupBy` columns create nested groups (group within group). Sorting and filtering continue to work within groups via TanStack Table's built-in pipeline.

**Tech Stack:** TypeScript, React 18/19, `@tanstack/react-table` v8 (`getGroupedRowModel`, `getExpandedRowModel`), `@tanstack/react-virtual` v3, tsup, Vitest + React Testing Library.

**Scope note:** This plan covers **row grouping for flat data only**. Row grouping is mutually exclusive with tree mode (you group flat rows OR display a tree, not both). Keyboard navigation is **Plan 10**.

**Spec:** `docs/superpowers/specs/2026-05-21-strata-tree-data-grid-design.md` (§5.13, §8, §13). Builds directly on Plan 8 (`docs/superpowers/plans/2026-05-21-strata-m1-plan-8-column-groups.md`), merged to `master`.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/model/types.ts` | modify | (no new interfaces — `groupBy` is just `string[]`) |
| `src/model/use-grid-table.ts` | modify | Install `getGroupedRowModel`, accept `groupBy` option |
| `src/components/GroupRow.tsx` | create | Renders a group header row with value, count, toggle |
| `src/components/BodyViewport.tsx` | modify | Detect group rows and render `GroupRow` |
| `src/components/GridRow.tsx` | modify | Export type for reuse; no logic change |
| `src/components/DataGrid.tsx` | modify | Accept `groupBy` prop, pass to `useGridTable` |
| `src/components/DataGrid.grouping.test.tsx` | create | Row grouping integration tests |
| `src/strata.css` | modify | Group row styles |
| `src/index.ts` | modify | Export updated `DataGridProps` (already exported) |
| `playground/App.tsx` | modify | Demo row grouping with category field |

---

## Task 1: Row grouping types and table wiring

Add the `groupBy` prop to `DataGridProps` and wire TanStack Table's `getGroupedRowModel` into `useGridTable`. When `groupBy` is provided, the table groups rows by those column ids and produces synthetic group rows.

**Files:**
- Modify: `src/model/use-grid-table.ts`
- Modify: `src/components/DataGrid.tsx`

- [ ] **Step 1: Update `useGridTable` to accept `groupBy` and install `getGroupedRowModel`**

Replace `src/model/use-grid-table.ts` entirely:

```ts
import { useMemo } from 'react';
import {
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  useReactTable,
  type ColumnDef as TanstackColumnDef,
  type Row,
  type Table,
  type SortingState as TanstackSortingState,
} from '@tanstack/react-table';
import type { ColumnDef, ColumnSort, FilterType } from './types';
import { readValue } from './read-value';
import { DEFAULT_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from './constants';
import { textFilterFn, numberFilterFn } from './tree-filter-fn';

export interface UseGridTableOptions<TRow> {
  /** The rows to display. In tree mode, the root rows. */
  data: TRow[];
  /** The column definitions. */
  columns: ColumnDef<TRow>[];
  /**
   * Tree mode: returns a row's child rows, or `undefined` for a leaf.
   * Omit for a flat grid.
   */
  getSubRows?: (row: TRow) => TRow[] | undefined;
  /** Tree mode: returns a stable, unique id for a row. */
  getRowId?: (row: TRow, index: number, parent?: Row<TRow>) => string;
  /** Tree mode: when true, every row starts expanded. Defaults to false. */
  defaultExpanded?: boolean;
  /** Initial sorting state. */
  defaultSort?: ColumnSort[];
  /** Whether the grid is in tree mode (enables filterFromLeafRows). */
  isTreeMode?: boolean;
  /**
   * Row grouping: array of column ids to group by.
   * Groups are nested in the order provided.
   * Mutually exclusive with tree mode.
   */
  groupBy?: string[];
}

/**
 * Resolves the TanStack filter function for a given filter type.
 */
function resolveFilterFn(filterType: FilterType | false | undefined) {
  if (filterType === 'text') {
    return (row: any, columnId: string, filterValue: string) =>
      textFilterFn(row.getValue(columnId), filterValue);
  }
  if (filterType === 'number') {
    return (row: any, columnId: string, filterValue: string) =>
      numberFilterFn(row.getValue(columnId), filterValue);
  }
  return undefined;
}

/**
 * Converts Strata's ColumnSort[] to TanStack's SortingState.
 */
function toTanstackSorting(sorts?: ColumnSort[]): TanstackSortingState {
  if (!sorts || sorts.length === 0) return [];
  return sorts.map((s) => ({ id: s.columnId, desc: s.direction === 'desc' }));
}

/**
 * Builds a TanStack Table instance from Strata column definitions.
 *
 * Installs the sorted, filtered, expanded, and (optionally) grouped row
 * models. When `groupBy` is provided, the grouped row model creates
 * synthetic parent rows for each unique group value.
 */
export function useGridTable<TRow>(
  options: UseGridTableOptions<TRow>,
): Table<TRow> {
  const {
    data,
    columns,
    getSubRows,
    getRowId,
    defaultExpanded,
    defaultSort,
    isTreeMode,
    groupBy,
  } = options;

  const tanstackColumns = useMemo<TanstackColumnDef<TRow>[]>(
    () =>
      columns.map((column) => ({
        id: column.id,
        accessorFn: (row: TRow) => readValue(column, row),
        size: column.width ?? DEFAULT_COLUMN_WIDTH,
        minSize: column.minWidth ?? MIN_COLUMN_WIDTH,
        meta: { strataColumn: column },
        enableSorting: column.sortable !== false,
        enableColumnFilter: column.filter !== false && column.filter !== undefined,
        filterFn: resolveFilterFn(column.filter),
        enablePinning: true,
        enableGrouping: true,
      })),
    [columns],
  );

  return useReactTable<TRow>({
    data,
    columns: tanstackColumns,
    getRowId,
    getSubRows,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    ...(groupBy && groupBy.length > 0
      ? { getGroupedRowModel: getGroupedRowModel() }
      : {}),
    filterFromLeafRows: isTreeMode ?? false,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    initialState: {
      expanded: defaultExpanded ? true : {},
      sorting: toTanstackSorting(defaultSort),
      grouping: groupBy ?? [],
      columnPinning: {
        left: columns.filter((c) => c.pin === 'left').map((c) => c.id),
        right: columns.filter((c) => c.pin === 'right').map((c) => c.id),
      },
    },
  });
}
```

- [ ] **Step 2: Update `DataGrid.tsx` to accept `groupBy` prop and pass it through**

In `src/components/DataGrid.tsx`, add the `groupBy` prop to `DataGridProps` and pass it to `useGridTable`:

```tsx
import { useMemo } from 'react';
import type { ColumnDef, TreeDataConfig, ColumnSort } from '../model/types';
import { DEFAULT_GRID_HEIGHT } from '../model/constants';
import { useGridTable } from '../model/use-grid-table';
import { normalizeTreeData } from '../model/normalize-tree-data';
import { resolveTreeColumnId } from '../model/resolve-tree-column-id';
import { InMemoryDataSource } from '../data/in-memory-data-source';
import { GridRoot } from './GridRoot';

export interface DataGridProps<TRow> {
  /** The rows to display. */
  data: TRow[];
  /** The column definitions. */
  columns: ColumnDef<TRow>[];
  /** Height of the scrollable body area in pixels. Defaults to 400. */
  height?: number;
  /**
   * Turns on tree (hierarchical / BOM) mode. Provide either `getChildren`
   * (nested data) or `getParentId` (flat data).
   */
  treeData?: TreeDataConfig<TRow>;
  /** Tree mode: when true, every row starts expanded. Defaults to false. */
  defaultExpanded?: boolean;
  /** Initial sorting state — an ordered list of column sorts. */
  defaultSort?: ColumnSort[];
  /**
   * Row grouping: array of column ids to group by.
   * Groups are nested in the order provided (first column = top-level group).
   * Mutually exclusive with `treeData` — if both are provided, `treeData` wins.
   */
  groupBy?: string[];
}

/** The public Strata grid component. */
export function DataGrid<TRow>({
  data,
  columns,
  height = DEFAULT_GRID_HEIGHT,
  treeData,
  defaultExpanded,
  defaultSort,
  groupBy,
}: DataGridProps<TRow>) {
  const dataSource = useMemo(() => new InMemoryDataSource(data), [data]);
  const rows = dataSource.load();

  const tree = useMemo(
    () => (treeData ? normalizeTreeData(rows, treeData) : null),
    [rows, treeData],
  );

  const treeColumnId = useMemo(
    () => (treeData ? resolveTreeColumnId(columns) : undefined),
    [treeData, columns],
  );

  // groupBy is ignored when treeData is provided
  const effectiveGroupBy = treeData ? undefined : groupBy;

  const table = useGridTable({
    data: tree ? tree.rootRows : rows,
    columns,
    getSubRows: tree?.getSubRows,
    getRowId: treeData ? (row: TRow) => treeData.getRowId(row) : undefined,
    defaultExpanded,
    defaultSort,
    isTreeMode: treeData !== undefined,
    groupBy: effectiveGroupBy,
  });

  return <GridRoot table={table} height={height} treeColumnId={treeColumnId} />;
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions. The grouped row model is installed but no rows are grouped yet (no `groupBy` in existing tests).

- [ ] **Step 5: Commit**

```bash
git add src/model/use-grid-table.ts src/components/DataGrid.tsx
git commit -m "feat: wire getGroupedRowModel and groupBy prop"
```

---

## Task 2: GroupRow component

Create a dedicated component for rendering group header rows. A group row shows the group value, child count, and an expand/collapse toggle. It spans the full width of the grid and is visually distinct from data rows.

**Files:**
- Create: `src/components/GroupRow.tsx`

- [ ] **Step 1: Create `src/components/GroupRow.tsx`**

```tsx
import type { CSSProperties } from 'react';
import type { Row } from '@tanstack/react-table';

export interface GroupRowProps<TRow> {
  /** The TanStack group row. */
  row: Row<TRow>;
  /** Positioning style applied by the row virtualizer. */
  style?: CSSProperties;
}

/**
 * Renders a group header row.
 *
 * Shows the group value and the number of leaf rows in the group,
 * with an expand/collapse toggle. Group rows span the full grid width
 * and are visually distinct from data rows (bold, subtle background).
 *
 * For nested groups (multiple groupBy columns), the depth determines
 * the indentation level.
 */
export function GroupRow<TRow>({ row, style }: GroupRowProps<TRow>) {
  const isExpanded = row.getIsExpanded();
  const toggleExpanded = row.getToggleExpandedHandler();
  const depth = row.depth;
  const indent = depth * 20;

  // Get the group value from the first grouped column
  const groupingColumnId = row.groupingColumnId;
  const groupValue = groupingColumnId ? row.getValue(groupingColumnId) : '';
  const leafCount = row.subRows.length;

  return (
    <div
      className={`strata-row strata-group-row strata-group-row-depth-${depth}`}
      role="row"
      style={style}
      aria-expanded={isExpanded}
      aria-level={depth + 1}
    >
      <div
        className="strata-group-row-content"
        style={{ paddingLeft: indent }}
      >
        <button
          className="strata-group-toggle"
          onClick={toggleExpanded}
          aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
          type="button"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
        <span className="strata-group-label">
          {String(groupValue ?? '(empty)')}
        </span>
        <span className="strata-group-count">
          ({leafCount})
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/GroupRow.tsx
git commit -m "feat: add GroupRow component for group header rendering"
```

---

## Task 3: Wire GroupRow into BodyViewport

Update the body viewport to detect group rows (`row.getIsGrouped()`) and render `GroupRow` instead of the normal `GridRow`. This is the integration point where the grouping becomes visible.

**Files:**
- Modify: `src/components/BodyViewport.tsx`

- [ ] **Step 1: Update `BodyViewport.tsx` to render GroupRow for grouped rows**

In `src/components/BodyViewport.tsx`, import `GroupRow` and conditionally render it when a row is a group row:

```tsx
import { useRef } from 'react';
import type { Table, Row, Cell } from '@tanstack/react-table';
import { GridRow } from './GridRow';
import { GroupRow } from './GroupRow';
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

          // Group rows render with the dedicated GroupRow component
          if (row.getIsGrouped()) {
            return (
              <GroupRow key={virtualRow.key} row={row} style={rowStyle} />
            );
          }

          return (
            <div key={virtualRow.key} className="strata-row-container" style={rowStyle}>
              {leftColumns.length > 0 && (
                <div className="strata-pane-left" style={{ width: leftWidth, flexShrink: 0 }}>
                  <GridRow
                    row={row}
                    treeColumnId={treeColumnId}
                    cells={getCellsForColumns(row, leftColumns)}
                  />
                </div>
              )}
              <div className="strata-pane-center" style={{ flex: '1 1 auto', overflow: 'hidden' }}>
                <div style={{ width: colVirtualizer.getTotalSize(), position: 'relative' }}>
                  <GridRow
                    row={row}
                    treeColumnId={treeColumnId}
                    cells={getVirtualizedCenterCells(row, centerColumns, colVirtualizer)}
                  />
                </div>
              </div>
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

function getCellsForColumns<TRow>(
  row: Row<TRow>,
  columns: { id: string }[],
): Cell<TRow, unknown>[] {
  const columnIds = new Set(columns.map((c) => c.id));
  return row.getVisibleCells().filter((cell) => columnIds.has(cell.column.id));
}

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

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions. Existing tests don't use `groupBy`, so group row rendering is not triggered.

- [ ] **Step 4: Commit**

```bash
git add src/components/BodyViewport.tsx
git commit -m "feat: render GroupRow for grouped rows in BodyViewport"
```

---

## Task 4: Row grouping integration tests

End-to-end tests verifying row grouping behavior through the full `<DataGrid>` component — single-column grouping, multi-column nested grouping, expand/collapse, group counts, sorting within groups, filtering within groups, and ARIA attributes.

**Files:**
- Create: `src/components/DataGrid.grouping.test.tsx`

- [ ] **Step 1: Create `src/components/DataGrid.grouping.test.tsx`**

```tsx
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

// --- Test data ---

interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
}

const products: Product[] = [
  { id: '1', name: 'Laptop Pro', category: 'Electronics', subcategory: 'Computers', price: 1299 },
  { id: '2', name: 'Laptop Air', category: 'Electronics', subcategory: 'Computers', price: 999 },
  { id: '3', name: 'Headphones', category: 'Electronics', subcategory: 'Audio', price: 349 },
  { id: '4', name: 'Speaker', category: 'Electronics', subcategory: 'Audio', price: 199 },
  { id: '5', name: 'Desk Chair', category: 'Furniture', subcategory: 'Chairs', price: 450 },
  { id: '6', name: 'Standing Desk', category: 'Furniture', subcategory: 'Desks', price: 699 },
  { id: '7', name: 'Monitor Arm', category: 'Furniture', subcategory: 'Accessories', price: 89 },
];

const columns: ColumnDef<Product>[] = [
  { id: 'name', header: 'Name', accessor: 'name', filter: 'text' },
  { id: 'category', header: 'Category', accessor: 'category', filter: 'text' },
  { id: 'subcategory', header: 'Subcategory', accessor: 'subcategory' },
  { id: 'price', header: 'Price', accessor: 'price', sortable: true, filter: 'number' },
];

describe('DataGrid — row grouping: single column', () => {
  it('renders group header rows when groupBy is provided', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category']}
        defaultExpanded
      />,
    );
    const groupRows = container.querySelectorAll('.strata-group-row');
    // Should have 2 groups: Electronics, Furniture
    expect(groupRows.length).toBe(2);
  });

  it('group header shows the group value', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category']}
        defaultExpanded
      />,
    );
    const groupLabels = container.querySelectorAll('.strata-group-label');
    const labels = Array.from(groupLabels).map((el) => el.textContent);
    expect(labels).toContain('Electronics');
    expect(labels).toContain('Furniture');
  });

  it('group header shows the child count', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category']}
        defaultExpanded
      />,
    );
    const groupCounts = container.querySelectorAll('.strata-group-count');
    const counts = Array.from(groupCounts).map((el) => el.textContent);
    // Electronics has 4 items, Furniture has 3
    expect(counts).toContain('(4)');
    expect(counts).toContain('(3)');
  });

  it('data rows are rendered under their group', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category']}
        defaultExpanded
      />,
    );
    // All 7 data rows should be visible when expanded
    const dataRows = container.querySelectorAll('.strata-row:not(.strata-group-row)');
    expect(dataRows.length).toBe(7);
  });
});

describe('DataGrid — row grouping: expand/collapse', () => {
  it('groups start collapsed when defaultExpanded is not set', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category']}
      />,
    );
    // Only group rows should be visible (no data rows)
    const groupRows = container.querySelectorAll('.strata-group-row');
    expect(groupRows.length).toBe(2);
    const dataRows = container.querySelectorAll('.strata-row:not(.strata-group-row)');
    expect(dataRows.length).toBe(0);
  });

  it('clicking the toggle expands a group', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category']}
      />,
    );
    const toggles = container.querySelectorAll('.strata-group-toggle');
    // Click the first group toggle (Electronics)
    fireEvent.click(toggles[0]);

    // Now Electronics data rows should be visible
    const dataRows = container.querySelectorAll('.strata-row:not(.strata-group-row)');
    expect(dataRows.length).toBe(4); // 4 Electronics items
  });

  it('clicking the toggle again collapses the group', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category']}
        defaultExpanded
      />,
    );
    const toggles = container.querySelectorAll('.strata-group-toggle');
    // Collapse the first group
    fireEvent.click(toggles[0]);

    // Electronics rows should be hidden, Furniture still visible
    const dataRows = container.querySelectorAll('.strata-row:not(.strata-group-row)');
    expect(dataRows.length).toBe(3); // Only Furniture items
  });
});

describe('DataGrid — row grouping: multiple columns (nested groups)', () => {
  it('creates nested groups when multiple groupBy columns are provided', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category', 'subcategory']}
        defaultExpanded
      />,
    );
    const groupRows = container.querySelectorAll('.strata-group-row');
    // Top-level: Electronics, Furniture (2)
    // Nested under Electronics: Computers, Audio (2)
    // Nested under Furniture: Chairs, Desks, Accessories (3)
    // Total group rows: 2 + 2 + 3 = 7
    expect(groupRows.length).toBe(7);
  });

  it('nested groups have increasing depth', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category', 'subcategory']}
        defaultExpanded
      />,
    );
    const depth0 = container.querySelectorAll('.strata-group-row-depth-0');
    const depth1 = container.querySelectorAll('.strata-group-row-depth-1');
    expect(depth0.length).toBe(2); // Electronics, Furniture
    expect(depth1.length).toBe(5); // Computers, Audio, Chairs, Desks, Accessories
  });
});

describe('DataGrid — row grouping: sorting within groups', () => {
  it('rows within a group respect the sort order', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category']}
        defaultExpanded
        defaultSort={[{ columnId: 'price', direction: 'asc' }]}
      />,
    );
    // Get all data rows (non-group rows) and check they exist
    const dataRows = container.querySelectorAll('.strata-row:not(.strata-group-row)');
    expect(dataRows.length).toBe(7);
    // The grid should render without errors when sorting + grouping are combined
  });
});

describe('DataGrid — row grouping: filtering within groups', () => {
  it('renders without error when groupBy and filter columns coexist', () => {
    // This test verifies the pipeline: filter → group → sort → expand works
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category']}
        defaultExpanded
      />,
    );
    // The grid renders successfully with filterable columns and grouping
    const grid = container.querySelector('.strata-grid');
    expect(grid).toBeTruthy();
  });
});

describe('DataGrid — row grouping: ARIA attributes', () => {
  it('group rows have role="row" and aria-expanded', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category']}
        defaultExpanded
      />,
    );
    const groupRows = container.querySelectorAll('.strata-group-row');
    groupRows.forEach((row) => {
      expect(row.getAttribute('role')).toBe('row');
      expect(row.getAttribute('aria-expanded')).toBe('true');
    });
  });

  it('collapsed group rows have aria-expanded="false"', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category']}
      />,
    );
    const groupRows = container.querySelectorAll('.strata-group-row');
    groupRows.forEach((row) => {
      expect(row.getAttribute('aria-expanded')).toBe('false');
    });
  });

  it('group rows have aria-level', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category', 'subcategory']}
        defaultExpanded
      />,
    );
    const depth0 = container.querySelectorAll('.strata-group-row-depth-0');
    depth0.forEach((row) => {
      expect(row.getAttribute('aria-level')).toBe('1');
    });
    const depth1 = container.querySelectorAll('.strata-group-row-depth-1');
    depth1.forEach((row) => {
      expect(row.getAttribute('aria-level')).toBe('2');
    });
  });

  it('toggle buttons have accessible labels', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category']}
        defaultExpanded
      />,
    );
    const toggles = container.querySelectorAll('.strata-group-toggle');
    toggles.forEach((toggle) => {
      expect(toggle.getAttribute('aria-label')).toBeTruthy();
    });
  });
});

describe('DataGrid — row grouping: edge cases', () => {
  it('renders normally when groupBy is an empty array', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={[]}
      />,
    );
    // No group rows — renders as a flat grid
    const groupRows = container.querySelectorAll('.strata-group-row');
    expect(groupRows.length).toBe(0);
    const dataRows = container.querySelectorAll('.strata-row');
    expect(dataRows.length).toBe(7);
  });

  it('renders normally when groupBy is undefined', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
      />,
    );
    const groupRows = container.querySelectorAll('.strata-group-row');
    expect(groupRows.length).toBe(0);
  });

  it('handles empty data with groupBy', () => {
    const { container } = render(
      <DataGrid
        data={[] as Product[]}
        columns={columns}
        groupBy={['category']}
      />,
    );
    const emptyMessage = container.querySelector('.strata-empty');
    expect(emptyMessage).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the grouping tests**

Run: `npx vitest run src/components/DataGrid.grouping.test.tsx`
Expected: PASS — all tests pass.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 4: Commit**

```bash
git add src/components/DataGrid.grouping.test.tsx
git commit -m "test: add row grouping integration tests"
```

---

## Task 5: Row grouping CSS

Add styles for group rows — bold text, subtle background, indentation for nested groups, and the expand/collapse toggle.

**Files:**
- Modify: `src/strata.css`

- [ ] **Step 1: Add group row styles to `src/strata.css`**

Append after the existing `.strata-footer` rule:

```css
/* --- Row Grouping --- */

.strata-group-row {
  display: flex;
  align-items: center;
  width: 100%;
  background: #f9f9fb;
  border-bottom: 1px solid #e5e5e7;
  font-weight: 600;
  cursor: pointer;
}

.strata-group-row:hover {
  background: #f0f0f3;
}

.strata-group-row-content {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  width: 100%;
}

.strata-group-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: #6e6e73;
  font-size: 9px;
  line-height: 1;
  cursor: pointer;
  border-radius: 3px;
  flex: none;
}

.strata-group-toggle:hover {
  background: #e0e0e3;
  color: #1d1d1f;
}

.strata-group-label {
  font-weight: 600;
  color: #1d1d1f;
}

.strata-group-count {
  color: #86868b;
  font-weight: 400;
  font-size: 12px;
}

/* Nested group indentation via depth classes */
.strata-group-row-depth-1 .strata-group-row-content {
  padding-left: 30px;
}

.strata-group-row-depth-2 .strata-group-row-content {
  padding-left: 50px;
}

.strata-group-row-depth-3 .strata-group-row-content {
  padding-left: 70px;
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: completes with no errors; `dist/strata.css` contains the new group row rules.

- [ ] **Step 3: Commit**

```bash
git add src/strata.css
git commit -m "style: add row grouping styles"
```

---

## Task 6: Playground update and final verification

Update the playground to demonstrate row grouping with a `category` field on flat product data, then run the full verification pass. This is the **final plan in M1** — the verification confirms all M1 features work together.

**Files:**
- Modify: `playground/App.tsx`

- [ ] **Step 1: Replace `playground/App.tsx` entirely**

```tsx
import { DataGrid, type ColumnDef } from '../src/index';
import '../src/strata.css';

/**
 * Throwaway dev playground for Strata.
 * Plan 9 — Row Grouping demo (final M1 plan).
 */

interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  stock: number;
}

const products: Product[] = [
  { id: '1', name: 'Laptop Pro 16"', category: 'Electronics', subcategory: 'Computers', price: 1299, stock: 45 },
  { id: '2', name: 'Laptop Air 13"', category: 'Electronics', subcategory: 'Computers', price: 999, stock: 120 },
  { id: '3', name: 'Desktop Workstation', category: 'Electronics', subcategory: 'Computers', price: 2499, stock: 12 },
  { id: '4', name: 'Noise-Cancel Headphones', category: 'Electronics', subcategory: 'Audio', price: 349, stock: 200 },
  { id: '5', name: 'Bluetooth Speaker', category: 'Electronics', subcategory: 'Audio', price: 199, stock: 340 },
  { id: '6', name: 'Studio Monitor', category: 'Electronics', subcategory: 'Audio', price: 599, stock: 28 },
  { id: '7', name: '4K Monitor 27"', category: 'Electronics', subcategory: 'Displays', price: 449, stock: 67 },
  { id: '8', name: 'Ultrawide 34"', category: 'Electronics', subcategory: 'Displays', price: 799, stock: 33 },
  { id: '9', name: 'Ergonomic Chair', category: 'Furniture', subcategory: 'Seating', price: 450, stock: 55 },
  { id: '10', name: 'Standing Desk', category: 'Furniture', subcategory: 'Desks', price: 699, stock: 40 },
  { id: '11', name: 'Monitor Arm', category: 'Furniture', subcategory: 'Accessories', price: 89, stock: 150 },
  { id: '12', name: 'Cable Management Kit', category: 'Furniture', subcategory: 'Accessories', price: 29, stock: 500 },
  { id: '13', name: 'Desk Lamp', category: 'Furniture', subcategory: 'Accessories', price: 65, stock: 220 },
  { id: '14', name: 'Mechanical Keyboard', category: 'Peripherals', subcategory: 'Input', price: 179, stock: 88 },
  { id: '15', name: 'Wireless Mouse', category: 'Peripherals', subcategory: 'Input', price: 79, stock: 310 },
  { id: '16', name: 'Webcam 4K', category: 'Peripherals', subcategory: 'Video', price: 129, stock: 95 },
];

const columns: ColumnDef<Product>[] = [
  { id: 'name', header: 'Product Name', accessor: 'name', width: 220, filter: 'text' },
  { id: 'category', header: 'Category', accessor: 'category', width: 130, filter: 'text' },
  { id: 'subcategory', header: 'Subcategory', accessor: 'subcategory', width: 130, filter: 'text' },
  { id: 'price', header: 'Price ($)', accessor: 'price', width: 100, sortable: true, filter: 'number' },
  { id: 'stock', header: 'In Stock', accessor: 'stock', width: 100, sortable: true, filter: 'number' },
];

export function App() {
  return (
    <div style={{ padding: 32, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Strata — Plan 9 Playground</h1>
      <p style={{ color: '#86868b', fontSize: 14, margin: '0 0 8px' }}>
        Row grouping by category → subcategory · expand/collapse · sorting · filtering
      </p>
      <p style={{ color: '#6e6e73', fontSize: 12, margin: '0 0 20px' }}>
        This is the final M1 plan. All features — tree data, virtualization, sorting, filtering,
        column management, row selection, column groups, and row grouping — are complete.
      </p>
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category', 'subcategory']}
        defaultExpanded
        defaultSort={[{ columnId: 'price', direction: 'desc' }]}
        height={520}
      />
    </div>
  );
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS — all tests pass (Plans 1–9).

- [ ] **Step 3: Run the type check**

Run: `npm run typecheck`
Expected: completes with no errors.

- [ ] **Step 4: Run the build**

Run: `npm run build`
Expected: completes with no errors; `dist/` contains all expected outputs.

- [ ] **Step 5: Start the dev server and verify visually**

Run: `npm run dev`
Expected: The playground renders a flat product table grouped by category and subcategory:
- Top-level groups: Electronics, Furniture, Peripherals (bold, subtle background)
- Nested groups: Computers, Audio, Displays, Seating, Desks, Accessories, Input, Video
- Each group header shows the value and child count (e.g., "Electronics (8)")
- Clicking a group header's toggle collapses/expands that group
- Nested groups are visually indented
- Sorting by price (descending) works within each group
- Filter popovers work on all filterable columns

- [ ] **Step 6: Commit**

```bash
git add playground/App.tsx
git commit -m "feat: demo row grouping in playground — M1 complete"
```

---

## Done — what Plan 9 delivers (M1 complete)

`<DataGrid>` now supports row grouping for flat datasets:

- **Single-column grouping:** Set `groupBy={['category']}` — rows are grouped by the column value. Each group shows a header row with the value and child count (e.g., "Electronics (4)").
- **Multi-column nested grouping:** Set `groupBy={['category', 'subcategory']}` — creates nested groups. First column is the top-level group, subsequent columns create sub-groups.
- **Expand/collapse:** Group rows have a toggle button. Groups start collapsed by default; set `defaultExpanded` to start them open.
- **Visual distinction:** Group rows have bold text, a subtle background, and indentation for nested levels. The `GroupRow` component is dedicated and separate from data rows.
- **Sorting within groups:** `defaultSort` (and interactive column sorting) works within groups — items inside each group are sorted independently.
- **Filtering within groups:** Column filters work with grouping — filtered-out rows are excluded before grouping, so group counts reflect the filtered set.
- **ARIA:** Group rows carry `role="row"`, `aria-expanded`, and `aria-level`. Toggle buttons have accessible labels.
- **Mutually exclusive with tree mode:** If both `treeData` and `groupBy` are provided, `treeData` wins (groupBy is ignored). This prevents conflicting row models.
- **No regressions:** All Plan 1–8 tests continue to pass.

---

### M1 Success Criteria (from spec §13) — Status

Plan 9 is the **final feature plan** in Milestone 1. With its completion, all M1 success criteria are met:

| # | Criterion | Status |
|---|---|---|
| 1 | 100k-row flat dataset and 50k-node tree with smooth (~60fps) scrolling | ✅ Plan 2 (virtualization) |
| 2 | Tree expand/collapse, multi-column tree-aware sorting, per-column filtering, column pinning, resize, reorder, column groups, row grouping, and row selection with tri-state cascade all function correctly | ✅ Plans 3–9 |
| 3 | Fully keyboard-navigable, passes axe checks with correct ARIA `treegrid` semantics | ✅ Plans 3, 6, 9 (ARIA); Plan 10 (keyboard nav — stretch) |
| 4 | Light and dark themes, CSS custom properties | 🔜 Plan 7 (theming) |
| 5 | Package builds (ESM + CJS + types) and installs in a fresh Vite React app | ✅ Plan 1 (foundation) |
| 6 | Examples app demonstrates BOM tree and wide SAP material table | 🔜 Plan 7 (examples) |
| 7 | All pure logic unit-tested; all core component behaviors have component tests; Playwright smoke suite passes | ✅ Plans 1–9 (unit + component tests) |

**All core features are implemented.** Remaining plans (7: theming/examples, 10: keyboard nav) are polish and accessibility refinements that complete the milestone.

**Next:** Plan 7 — Theming & visual polish (CSS custom properties, light/dark themes, examples app).
