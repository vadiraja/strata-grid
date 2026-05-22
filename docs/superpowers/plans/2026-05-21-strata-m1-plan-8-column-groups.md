# Strata M1 · Plan 8 — Column Groups · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add column groups (stacked multi-row headers) to the grid. Consumers define hierarchical column structures where a group header spans multiple leaf columns. Nested groups create multiple header rows — e.g., "Identification" spanning Material + Description, "Quantity" spanning Qty + UoM. TanStack Table supports this natively via nested `columns` arrays.

**Architecture:** A new `ColumnGroup<TRow>` interface wraps child columns (or nested groups) under a group header. The public `columns` prop becomes `AnyColumn<TRow>[] = (ColumnDef<TRow> | ColumnGroup<TRow>)[]`. A `normalizeColumns` function converts the Strata column tree into TanStack's nested `ColumnDef` format. TanStack Table's `getHeaderGroups()` already returns multiple header rows when columns are nested — `HeaderArea` iterates these rows and renders group header cells with `colSpan`. A `ColumnGroupHeaderCell` component renders spanning group headers with centered text.

**Tech Stack:** TypeScript, React 18/19, `@tanstack/react-table` v8 (nested column groups, `getHeaderGroups`), `@tanstack/react-virtual` v3, tsup, Vitest + React Testing Library.

**Scope note:** This plan covers **column groups (stacked headers) only**. Row grouping/aggregation is **Plan 9**. Keyboard navigation is **Plan 10**.

**Spec:** `docs/superpowers/specs/2026-05-21-strata-tree-data-grid-design.md` (§5.12, §9.2). Builds directly on Plan 7 (theming), merged to `master`.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/model/types.ts` | modify | Add `ColumnGroup<TRow>`, `AnyColumn<TRow>` types |
| `src/model/normalize-columns.ts` | create | Convert `AnyColumn[]` to TanStack nested column format |
| `src/model/normalize-columns.test.ts` | create | Normalization tests (flat, single-level, nested groups) |
| `src/model/use-grid-table.ts` | modify | Accept pre-normalized TanStack columns |
| `src/components/ColumnGroupHeaderCell.tsx` | create | Group header cell with colSpan |
| `src/components/HeaderArea.tsx` | modify | Render group header cells for non-leaf header rows |
| `src/components/DataGrid.tsx` | modify | Accept `AnyColumn<TRow>[]`, call `normalizeColumns` |
| `src/components/DataGrid.columnGroups.test.tsx` | create | Column groups integration tests |
| `src/strata.css` | modify | Group header cell styles |
| `src/index.ts` | modify | Export `ColumnGroup`, `AnyColumn` |
| `playground/App.tsx` | modify | Demo grouped columns on the BOM |

---

## Task 1: Column group types

Add the `ColumnGroup<TRow>` interface and `AnyColumn<TRow>` type alias to the type system. A column group has a `groupId`, a `header` string, and a `columns` array that can contain leaf columns or nested groups. Update `DataGridProps` to accept `AnyColumn<TRow>[]`.

**Files:**
- Modify: `src/model/types.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Add column group types to `src/model/types.ts`**

Append the following after the `TreeDataConfig` interface (before the `declare module` block):

```ts
/**
 * A column group — a stacked header that spans multiple child columns.
 *
 * Groups can be nested: a group's `columns` array may contain other
 * `ColumnGroup` entries, creating multiple header rows (stacked headers).
 *
 * TanStack Table supports this natively via nested column definitions.
 */
export interface ColumnGroup<TRow> {
  /** Unique, stable group id. */
  groupId: string;
  /** Header content for the group — displayed in the spanning header cell. */
  header: string;
  /**
   * The child columns (or nested groups) that this group spans.
   * At least one child is required.
   */
  columns: AnyColumn<TRow>[];
}

/**
 * A column definition or a column group. This is the public type for
 * the `columns` prop on `<DataGrid>`.
 */
export type AnyColumn<TRow> = ColumnDef<TRow> | ColumnGroup<TRow>;

/**
 * Type guard: returns true if the column entry is a `ColumnGroup`.
 */
export function isColumnGroup<TRow>(col: AnyColumn<TRow>): col is ColumnGroup<TRow> {
  return 'groupId' in col && 'columns' in col;
}
```

- [ ] **Step 2: Export new types from `src/index.ts`**

Add `ColumnGroup`, `AnyColumn`, and `isColumnGroup` to the exports:

```ts
export { DataGrid } from './components/DataGrid';
export type { DataGridProps } from './components/DataGrid';
export type {
  ColumnDef,
  CellContext,
  TreeDataConfig,
  SortDirection,
  ColumnSort,
  SortingState,
  FilterType,
  SelectionConfig,
  SelectionState,
  ColumnGroup,
  AnyColumn,
} from './model/types';
export { isColumnGroup } from './model/types';
export { InMemoryDataSource } from './data/in-memory-data-source';
export type { DataSource } from './data/data-source';
```

- [ ] **Step 3: Verify types type-check**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 4: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — all existing tests pass unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/model/types.ts src/index.ts
git commit -m "feat: add ColumnGroup and AnyColumn types"
```

---

## Task 2: Column group normalization

A pure function that converts the Strata `AnyColumn[]` tree into TanStack Table's nested `ColumnDef` format. Leaf columns become TanStack column defs (with `accessorFn`, `size`, `meta`, etc.). Groups become TanStack column group defs (with `header` and nested `columns`). This is the bridge between Strata's public API and TanStack's internal representation.

**Files:**
- Create: `src/model/normalize-columns.ts`
- Create: `src/model/normalize-columns.test.ts`

- [ ] **Step 1: Write the failing test — `src/model/normalize-columns.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { normalizeColumns, getLeafColumns } from './normalize-columns';
import type { ColumnDef, ColumnGroup, AnyColumn } from './types';

interface Row {
  id: string;
  name: string;
  qty: number;
  uom: string;
  desc: string;
}

const colName: ColumnDef<Row> = { id: 'name', header: 'Name', accessor: 'name', width: 150 };
const colQty: ColumnDef<Row> = { id: 'qty', header: 'Qty', accessor: 'qty', width: 80 };
const colUom: ColumnDef<Row> = { id: 'uom', header: 'UoM', accessor: 'uom', width: 80 };
const colDesc: ColumnDef<Row> = { id: 'desc', header: 'Description', accessor: 'desc', width: 200 };

describe('normalizeColumns', () => {
  it('converts flat columns (no groups) to TanStack column defs', () => {
    const columns: AnyColumn<Row>[] = [colName, colQty];
    const result = normalizeColumns(columns);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('name');
    expect(result[1].id).toBe('qty');
    // Leaf columns have accessorFn
    expect(result[0]).toHaveProperty('accessorFn');
    expect(result[1]).toHaveProperty('accessorFn');
    // No nested columns array on leaf defs
    expect(result[0]).not.toHaveProperty('columns');
  });

  it('converts a single-level group to a TanStack group with nested columns', () => {
    const group: ColumnGroup<Row> = {
      groupId: 'quantity',
      header: 'Quantity',
      columns: [colQty, colUom],
    };
    const columns: AnyColumn<Row>[] = [colName, group];
    const result = normalizeColumns(columns);

    expect(result).toHaveLength(2);
    // First is a leaf
    expect(result[0].id).toBe('name');
    // Second is a group
    expect(result[1].id).toBe('quantity');
    expect(result[1].header).toBe('Quantity');
    expect(result[1].columns).toHaveLength(2);
    expect(result[1].columns![0].id).toBe('qty');
    expect(result[1].columns![1].id).toBe('uom');
  });

  it('converts nested groups (2+ levels) to deeply nested TanStack columns', () => {
    const innerGroup: ColumnGroup<Row> = {
      groupId: 'quantity',
      header: 'Quantity',
      columns: [colQty, colUom],
    };
    const outerGroup: ColumnGroup<Row> = {
      groupId: 'details',
      header: 'Details',
      columns: [colDesc, innerGroup],
    };
    const columns: AnyColumn<Row>[] = [colName, outerGroup];
    const result = normalizeColumns(columns);

    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('details');
    expect(result[1].columns).toHaveLength(2);
    // First child of outer group is a leaf
    expect(result[1].columns![0].id).toBe('desc');
    // Second child is the inner group
    expect(result[1].columns![1].id).toBe('quantity');
    expect(result[1].columns![1].columns).toHaveLength(2);
  });

  it('preserves column sizing on leaf columns', () => {
    const columns: AnyColumn<Row>[] = [colName];
    const result = normalizeColumns(columns);
    expect(result[0].size).toBe(150);
  });

  it('preserves sortable and filter settings on leaf columns', () => {
    const col: ColumnDef<Row> = {
      id: 'name',
      header: 'Name',
      accessor: 'name',
      sortable: false,
      filter: 'text',
    };
    const result = normalizeColumns([col]);
    expect(result[0].enableSorting).toBe(false);
    expect(result[0].enableColumnFilter).toBe(true);
  });

  it('preserves pin setting on leaf columns', () => {
    const col: ColumnDef<Row> = {
      id: 'name',
      header: 'Name',
      accessor: 'name',
      pin: 'left',
    };
    const result = normalizeColumns([col]);
    expect(result[0].meta?.strataColumn.pin).toBe('left');
  });
});

describe('getLeafColumns', () => {
  it('returns all leaf columns from a flat array', () => {
    const columns: AnyColumn<Row>[] = [colName, colQty];
    const leaves = getLeafColumns(columns);
    expect(leaves).toHaveLength(2);
    expect(leaves[0].id).toBe('name');
    expect(leaves[1].id).toBe('qty');
  });

  it('extracts leaf columns from groups', () => {
    const group: ColumnGroup<Row> = {
      groupId: 'quantity',
      header: 'Quantity',
      columns: [colQty, colUom],
    };
    const columns: AnyColumn<Row>[] = [colName, group];
    const leaves = getLeafColumns(columns);
    expect(leaves).toHaveLength(3);
    expect(leaves.map((l) => l.id)).toEqual(['name', 'qty', 'uom']);
  });

  it('extracts leaf columns from nested groups', () => {
    const innerGroup: ColumnGroup<Row> = {
      groupId: 'quantity',
      header: 'Quantity',
      columns: [colQty, colUom],
    };
    const outerGroup: ColumnGroup<Row> = {
      groupId: 'details',
      header: 'Details',
      columns: [colDesc, innerGroup],
    };
    const columns: AnyColumn<Row>[] = [colName, outerGroup];
    const leaves = getLeafColumns(columns);
    expect(leaves).toHaveLength(4);
    expect(leaves.map((l) => l.id)).toEqual(['name', 'desc', 'qty', 'uom']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/model/normalize-columns.test.ts`
Expected: FAIL — `Failed to resolve import "./normalize-columns"`.

- [ ] **Step 3: Create `src/model/normalize-columns.ts`**

```ts
import { useMemo } from 'react';
import type {
  ColumnDef as TanstackColumnDef,
} from '@tanstack/react-table';
import type { ColumnDef, AnyColumn, ColumnGroup, FilterType } from './types';
import { isColumnGroup } from './types';
import { readValue } from './read-value';
import { DEFAULT_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from './constants';
import { textFilterFn, numberFilterFn } from './tree-filter-fn';

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
 * Converts a single Strata leaf `ColumnDef` into a TanStack column def.
 */
function toTanstackLeaf<TRow>(column: ColumnDef<TRow>): TanstackColumnDef<TRow> {
  return {
    id: column.id,
    accessorFn: (row: TRow) => readValue(column, row),
    size: column.width ?? DEFAULT_COLUMN_WIDTH,
    minSize: column.minWidth ?? MIN_COLUMN_WIDTH,
    meta: { strataColumn: column },
    enableSorting: column.sortable !== false,
    enableColumnFilter: column.filter !== false && column.filter !== undefined,
    filterFn: resolveFilterFn(column.filter),
    enablePinning: true,
  };
}

/**
 * Converts a Strata `ColumnGroup` into a TanStack column group def.
 * Recursively processes child columns/groups.
 */
function toTanstackGroup<TRow>(group: ColumnGroup<TRow>): TanstackColumnDef<TRow> {
  return {
    id: group.groupId,
    header: group.header,
    columns: group.columns.map((child) =>
      isColumnGroup(child) ? toTanstackGroup(child) : toTanstackLeaf(child),
    ),
  };
}

/**
 * Converts a Strata `AnyColumn[]` tree into TanStack Table's nested
 * column definition format.
 *
 * - Leaf `ColumnDef` entries become TanStack column defs with `accessorFn`.
 * - `ColumnGroup` entries become TanStack group defs with nested `columns`.
 * - Nesting is recursive — groups can contain other groups.
 *
 * This is the bridge between Strata's public column API and TanStack's
 * internal representation. TanStack Table uses the nesting to produce
 * multiple header rows via `getHeaderGroups()`.
 */
export function normalizeColumns<TRow>(
  columns: AnyColumn<TRow>[],
): TanstackColumnDef<TRow>[] {
  return columns.map((col) =>
    isColumnGroup(col) ? toTanstackGroup(col) : toTanstackLeaf(col),
  );
}

/**
 * Extracts all leaf `ColumnDef` entries from a potentially nested
 * `AnyColumn[]` tree. Useful for resolving tree column ids, pinning
 * state, and other operations that need the flat list of data columns.
 */
export function getLeafColumns<TRow>(columns: AnyColumn<TRow>[]): ColumnDef<TRow>[] {
  const leaves: ColumnDef<TRow>[] = [];
  const stack: AnyColumn<TRow>[] = [...columns];

  while (stack.length > 0) {
    const col = stack.shift()!;
    if (isColumnGroup(col)) {
      stack.unshift(...col.columns);
    } else {
      leaves.push(col);
    }
  }

  return leaves;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/model/normalize-columns.test.ts`
Expected: PASS — all 11 tests passing.

- [ ] **Step 5: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — all existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/model/normalize-columns.ts src/model/normalize-columns.test.ts
git commit -m "feat: add normalizeColumns and getLeafColumns for column groups"
```

---

## Task 3: Wire column groups into useGridTable

Update `useGridTable` to accept pre-normalized TanStack columns (produced by `normalizeColumns`). This allows the hook to receive either flat columns or nested group columns. The normalization happens in `DataGrid` before calling the hook, so `useGridTable` simply passes the TanStack columns through.

**Files:**
- Modify: `src/model/use-grid-table.ts`
- Modify: `src/model/use-grid-table.test.ts`

- [ ] **Step 1: Add a `tanstackColumns` option to `UseGridTableOptions`**

Update `src/model/use-grid-table.ts` — add an optional `tanstackColumns` field to the options interface and use it when provided (bypassing the internal column mapping):

```ts
import { useMemo } from 'react';
import {
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  getFilteredRowModel,
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
  /** The column definitions (flat, used when tanstackColumns is not provided). */
  columns: ColumnDef<TRow>[];
  /**
   * Pre-normalized TanStack column definitions (may include nested groups).
   * When provided, `columns` is ignored for table construction but still
   * used for pinning state derivation.
   */
  tanstackColumns?: TanstackColumnDef<TRow>[];
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
 * Installs the sorted, filtered, and expanded row models. Sorting is
 * multi-column and tree-aware (siblings sort within their parent).
 * Filtering in tree mode uses `filterFromLeafRows` so ancestor rows
 * remain visible when a descendant matches.
 *
 * When `tanstackColumns` is provided (column groups), uses those directly.
 * Otherwise, maps flat `columns` to TanStack format internally.
 */
export function useGridTable<TRow>(
  options: UseGridTableOptions<TRow>,
): Table<TRow> {
  const {
    data,
    columns,
    tanstackColumns: preNormalized,
    getSubRows,
    getRowId,
    defaultExpanded,
    defaultSort,
    isTreeMode,
  } = options;

  const tanstackColumns = useMemo<TanstackColumnDef<TRow>[]>(
    () =>
      preNormalized ??
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
      })),
    [columns, preNormalized],
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
    filterFromLeafRows: isTreeMode ?? false,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    initialState: {
      expanded: defaultExpanded ? true : {},
      sorting: toTanstackSorting(defaultSort),
      columnPinning: {
        left: columns.filter((c) => c.pin === 'left').map((c) => c.id),
        right: columns.filter((c) => c.pin === 'right').map((c) => c.id),
      },
    },
  });
}
```

- [ ] **Step 2: Add column group tests to `src/model/use-grid-table.test.ts`**

Append the following test block to the end of the file:

```ts
describe('useGridTable — column groups (tanstackColumns)', () => {
  it('accepts pre-normalized tanstack columns with nested groups', () => {
    const tanstackCols: TanstackColumnDef<Material>[] = [
      {
        id: 'identification',
        header: 'Identification',
        columns: [
          {
            id: 'name',
            accessorFn: (row: Material) => row.name,
            size: 150,
            meta: { strataColumn: columns[0] },
            enableSorting: true,
            enableColumnFilter: false,
            enablePinning: true,
          },
        ],
      },
      {
        id: 'qty',
        accessorFn: (row: Material) => row.qty,
        size: 80,
        meta: { strataColumn: columns[1] },
        enableSorting: true,
        enableColumnFilter: false,
        enablePinning: true,
      },
    ];

    const { result } = renderHook(() =>
      useGridTable({ data, columns, tanstackColumns: tanstackCols }),
    );

    // Should produce multiple header groups (2 rows: group row + leaf row)
    const headerGroups = result.current.getHeaderGroups();
    expect(headerGroups.length).toBeGreaterThanOrEqual(2);
  });

  it('produces correct leaf columns from nested groups', () => {
    const tanstackCols: TanstackColumnDef<Material>[] = [
      {
        id: 'all',
        header: 'All Columns',
        columns: [
          {
            id: 'name',
            accessorFn: (row: Material) => row.name,
            size: 150,
            meta: { strataColumn: columns[0] },
            enableSorting: true,
            enableColumnFilter: false,
            enablePinning: true,
          },
          {
            id: 'qty',
            accessorFn: (row: Material) => row.qty,
            size: 80,
            meta: { strataColumn: columns[1] },
            enableSorting: true,
            enableColumnFilter: false,
            enablePinning: true,
          },
        ],
      },
    ];

    const { result } = renderHook(() =>
      useGridTable({ data, columns, tanstackColumns: tanstackCols }),
    );

    const leafColumns = result.current.getAllLeafColumns();
    expect(leafColumns).toHaveLength(2);
    expect(leafColumns[0].id).toBe('name');
    expect(leafColumns[1].id).toBe('qty');
  });

  it('falls back to flat columns mapping when tanstackColumns is not provided', () => {
    const { result } = renderHook(() =>
      useGridTable({ data, columns }),
    );
    const headerGroups = result.current.getHeaderGroups();
    // Flat columns produce exactly 1 header group
    expect(headerGroups).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run the tests to verify they pass**

Run: `npx vitest run src/model/use-grid-table.test.ts`
Expected: PASS — all tests passing (existing + 3 new).

- [ ] **Step 4: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — all existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/model/use-grid-table.ts src/model/use-grid-table.test.ts
git commit -m "feat: useGridTable accepts pre-normalized tanstackColumns for groups"
```

---

## Task 4: Multi-row header rendering

Update `HeaderArea` to correctly render group header cells when column groups produce multiple header rows. Create a `ColumnGroupHeaderCell` component that renders a spanning group header with centered text and proper `colSpan` width.

**Files:**
- Create: `src/components/ColumnGroupHeaderCell.tsx`
- Modify: `src/components/HeaderArea.tsx`

- [ ] **Step 1: Create `src/components/ColumnGroupHeaderCell.tsx`**

```tsx
import { flexRender, type Header } from '@tanstack/react-table';

export interface ColumnGroupHeaderCellProps<TRow> {
  /** The TanStack header representing a column group. */
  header: Header<TRow, unknown>;
}

/**
 * Renders a column group header cell that spans multiple child columns.
 *
 * The width is computed from the header's `getSize()` which accounts for
 * all spanned leaf columns. The cell displays the group's header text
 * centered over its children.
 */
export function ColumnGroupHeaderCell<TRow>({
  header,
}: ColumnGroupHeaderCellProps<TRow>) {
  const width = header.getSize();

  return (
    <div
      className="strata-header-cell strata-group-header-cell"
      role="columnheader"
      style={{ width }}
      aria-colspan={header.colSpan}
    >
      <span className="strata-header-label">
        {header.isPlaceholder
          ? null
          : flexRender(header.column.columnDef.header, header.getContext())}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Update `src/components/HeaderArea.tsx` to use `ColumnGroupHeaderCell`**

Replace `src/components/HeaderArea.tsx` entirely:

```tsx
import { useCallback, useState } from 'react';
import type { Table, Header } from '@tanstack/react-table';
import { ColumnHeaderCell } from './ColumnHeaderCell';
import { ColumnGroupHeaderCell } from './ColumnGroupHeaderCell';

export interface HeaderAreaProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
}

/**
 * Returns true if a header represents a leaf column (not a group).
 * A leaf header has no sub-headers (colSpan === 1 and is not a placeholder
 * for a group that doesn't exist at this level).
 */
function isLeafHeader<TRow>(header: Header<TRow, unknown>): boolean {
  return header.column.columns.length === 0;
}

/** Renders the grid header with support for multi-row grouped headers. */
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

  // suppress unused variable warning — columnOrder drives table.setColumnOrder
  void columnOrder;

  const headerGroups = table.getHeaderGroups();

  return (
    <div className="strata-header" role="rowgroup">
      {headerGroups.map((headerGroup) => (
        <div className="strata-header-row" role="row" key={headerGroup.id}>
          {headerGroup.headers.map((header) => {
            // Leaf columns in the bottom-most row get the full interactive header
            if (isLeafHeader(header)) {
              return (
                <ColumnHeaderCell
                  key={header.id}
                  header={header}
                  onColumnReorder={handleColumnReorder}
                />
              );
            }
            // Group headers (or placeholders) get the spanning group cell
            return (
              <ColumnGroupHeaderCell key={header.id} header={header} />
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 4: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — existing header tests still pass (they use flat columns, producing 1 header row).

- [ ] **Step 5: Commit**

```bash
git add src/components/ColumnGroupHeaderCell.tsx src/components/HeaderArea.tsx
git commit -m "feat: multi-row header rendering with ColumnGroupHeaderCell"
```

---

## Task 4b: Wire column groups into DataGrid

Update `DataGrid` to accept `AnyColumn<TRow>[]` for its `columns` prop. When groups are present, `normalizeColumns` produces the nested TanStack column defs and `getLeafColumns` extracts the flat leaf list for pinning and tree column resolution.

**Files:**
- Modify: `src/components/DataGrid.tsx`

- [ ] **Step 1: Replace `src/components/DataGrid.tsx` entirely**

```tsx
import { useMemo } from 'react';
import type { ColumnDef, AnyColumn, TreeDataConfig, ColumnSort, SelectionConfig, SelectionState } from '../model/types';
import { isColumnGroup } from '../model/types';
import { DEFAULT_GRID_HEIGHT } from '../model/constants';
import { useGridTable } from '../model/use-grid-table';
import { normalizeColumns, getLeafColumns } from '../model/normalize-columns';
import { normalizeTreeData } from '../model/normalize-tree-data';
import { resolveTreeColumnId } from '../model/resolve-tree-column-id';
import { InMemoryDataSource } from '../data/in-memory-data-source';
import { GridRoot } from './GridRoot';

export interface DataGridProps<TRow> {
  /** The rows to display. */
  data: TRow[];
  /**
   * The column definitions. Accepts flat `ColumnDef[]` or a mix of
   * `ColumnDef` and `ColumnGroup` entries for stacked multi-row headers.
   */
  columns: AnyColumn<TRow>[];
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
   * Enables row selection. Provide a `SelectionConfig` to activate
   * checkboxes and selection behavior.
   */
  selection?: SelectionConfig;
  /**
   * Callback fired when the selection state changes.
   * Receives the new `SelectionState` with the set of selected row ids.
   */
  onSelectionChange?: (state: SelectionState) => void;
}

/** The public Strata grid component. */
export function DataGrid<TRow>({
  data,
  columns,
  height = DEFAULT_GRID_HEIGHT,
  treeData,
  defaultExpanded,
  defaultSort,
  selection,
  onSelectionChange,
}: DataGridProps<TRow>) {
  const dataSource = useMemo(() => new InMemoryDataSource(data), [data]);
  const rows = dataSource.load();

  // Extract leaf columns for pinning, tree column resolution, etc.
  const leafColumns = useMemo(() => getLeafColumns(columns), [columns]);

  // Determine if we have any column groups
  const hasGroups = useMemo(
    () => columns.some((col) => isColumnGroup(col)),
    [columns],
  );

  // Normalize columns to TanStack format (handles both flat and grouped)
  const tanstackColumns = useMemo(
    () => (hasGroups ? normalizeColumns(columns) : undefined),
    [columns, hasGroups],
  );

  const tree = useMemo(
    () => (treeData ? normalizeTreeData(rows, treeData) : null),
    [rows, treeData],
  );

  const treeColumnId = useMemo(
    () => (treeData ? resolveTreeColumnId(leafColumns) : undefined),
    [treeData, leafColumns],
  );

  const table = useGridTable({
    data: tree ? tree.rootRows : rows,
    columns: leafColumns,
    tanstackColumns,
    getSubRows: tree?.getSubRows,
    getRowId: treeData ? (row: TRow) => treeData.getRowId(row) : undefined,
    defaultExpanded,
    defaultSort,
    isTreeMode: treeData !== undefined,
  });

  return <GridRoot table={table} height={height} treeColumnId={treeColumnId} />;
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 3: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — all existing tests pass (they use flat `ColumnDef[]` which is a valid subset of `AnyColumn[]`).

- [ ] **Step 4: Commit**

```bash
git add src/components/DataGrid.tsx
git commit -m "feat: DataGrid accepts AnyColumn[] with column group support"
```

---

## Task 5: Column groups integration tests

End-to-end tests for column group rendering: multiple header rows, correct spanning, leaf columns still functional, nested groups creating 3+ rows, and sorting/filtering still working on leaf columns within groups.

**Files:**
- Create: `src/components/DataGrid.columnGroups.test.tsx`

- [ ] **Step 1: Create `src/components/DataGrid.columnGroups.test.tsx`**

```tsx
import { render, screen, fireEvent, within } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef, ColumnGroup, AnyColumn } from '../model/types';

interface Item {
  id: string;
  material: string;
  description: string;
  qty: number;
  uom: string;
}

const items: Item[] = [
  { id: '1', material: 'PT-100', description: 'Bolt M8x30', qty: 12, uom: 'EA' },
  { id: '2', material: 'PT-200', description: 'Nut M8', qty: 24, uom: 'EA' },
  { id: '3', material: 'PT-300', description: 'Washer M8', qty: 48, uom: 'EA' },
];

const colMaterial: ColumnDef<Item> = {
  id: 'material',
  header: 'Material',
  accessor: 'material',
  width: 120,
};

const colDescription: ColumnDef<Item> = {
  id: 'description',
  header: 'Description',
  accessor: 'description',
  width: 200,
};

const colQty: ColumnDef<Item> = {
  id: 'qty',
  header: 'Qty',
  accessor: 'qty',
  width: 80,
  filter: 'number',
};

const colUom: ColumnDef<Item> = {
  id: 'uom',
  header: 'UoM',
  accessor: 'uom',
  width: 80,
};

describe('DataGrid — column groups', () => {
  it('renders a single header row for flat columns (no groups)', () => {
    const columns: AnyColumn<Item>[] = [colMaterial, colDescription, colQty, colUom];
    render(<DataGrid data={items} columns={columns} />);

    const headerRows = screen.getAllByRole('row');
    // 1 header row + 3 data rows = 4 total rows
    // But within the rowgroup, only 1 header row
    const rowgroup = screen.getByRole('rowgroup');
    const headerRowsInGroup = within(rowgroup).getAllByRole('row');
    expect(headerRowsInGroup).toHaveLength(1);
  });

  it('renders two header rows for single-level grouped columns', () => {
    const identGroup: ColumnGroup<Item> = {
      groupId: 'identification',
      header: 'Identification',
      columns: [colMaterial, colDescription],
    };
    const qtyGroup: ColumnGroup<Item> = {
      groupId: 'quantity',
      header: 'Quantity',
      columns: [colQty, colUom],
    };
    const columns: AnyColumn<Item>[] = [identGroup, qtyGroup];
    render(<DataGrid data={items} columns={columns} />);

    const rowgroup = screen.getByRole('rowgroup');
    const headerRows = within(rowgroup).getAllByRole('row');
    expect(headerRows).toHaveLength(2);
  });

  it('renders group header text in the spanning cell', () => {
    const identGroup: ColumnGroup<Item> = {
      groupId: 'identification',
      header: 'Identification',
      columns: [colMaterial, colDescription],
    };
    const columns: AnyColumn<Item>[] = [identGroup, colQty];
    render(<DataGrid data={items} columns={columns} />);

    expect(screen.getByText('Identification')).toBeInTheDocument();
  });

  it('group header cell spans the correct width (sum of child columns)', () => {
    const identGroup: ColumnGroup<Item> = {
      groupId: 'identification',
      header: 'Identification',
      columns: [colMaterial, colDescription],
    };
    const columns: AnyColumn<Item>[] = [identGroup, colQty];
    render(<DataGrid data={items} columns={columns} />);

    const groupCell = screen.getByText('Identification').closest('.strata-group-header-cell');
    expect(groupCell).toBeInTheDocument();
    // Width should be sum of material (120) + description (200) = 320
    const style = (groupCell as HTMLElement).style;
    expect(parseInt(style.width, 10)).toBe(320);
  });

  it('leaf columns still render correctly under groups', () => {
    const identGroup: ColumnGroup<Item> = {
      groupId: 'identification',
      header: 'Identification',
      columns: [colMaterial, colDescription],
    };
    const columns: AnyColumn<Item>[] = [identGroup, colQty];
    render(<DataGrid data={items} columns={columns} />);

    // Leaf headers should be present
    expect(screen.getByText('Material')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Qty')).toBeInTheDocument();

    // Data cells should render
    expect(screen.getByText('PT-100')).toBeInTheDocument();
    expect(screen.getByText('Bolt M8x30')).toBeInTheDocument();
  });

  it('nested groups create 3+ header rows', () => {
    const innerGroup: ColumnGroup<Item> = {
      groupId: 'amounts',
      header: 'Amounts',
      columns: [colQty, colUom],
    };
    const outerGroup: ColumnGroup<Item> = {
      groupId: 'details',
      header: 'Details',
      columns: [colDescription, innerGroup],
    };
    const columns: AnyColumn<Item>[] = [colMaterial, outerGroup];
    render(<DataGrid data={items} columns={columns} />);

    const rowgroup = screen.getByRole('rowgroup');
    const headerRows = within(rowgroup).getAllByRole('row');
    // 3 levels: outer group row, inner group row, leaf row
    expect(headerRows.length).toBeGreaterThanOrEqual(3);
  });

  it('sorting still works on leaf columns within groups', () => {
    const identGroup: ColumnGroup<Item> = {
      groupId: 'identification',
      header: 'Identification',
      columns: [
        { ...colMaterial, sortable: true },
        { ...colDescription, sortable: true },
      ],
    };
    const columns: AnyColumn<Item>[] = [identGroup, colQty];
    render(<DataGrid data={items} columns={columns} />);

    // Click the Material leaf header to sort
    fireEvent.click(screen.getByText('Material'));

    // After ascending sort, PT-100 should be first (already is alphabetically)
    const cells = screen.getAllByRole('gridcell');
    const materialCells = cells.filter((c) =>
      c.textContent?.match(/^PT-/),
    );
    expect(materialCells[0].textContent).toBe('PT-100');
    expect(materialCells[1].textContent).toBe('PT-200');
    expect(materialCells[2].textContent).toBe('PT-300');
  });

  it('filtering still works on leaf columns within groups', () => {
    const qtyGroup: ColumnGroup<Item> = {
      groupId: 'quantity',
      header: 'Quantity',
      columns: [
        { ...colQty, filter: 'number' },
        colUom,
      ],
    };
    const columns: AnyColumn<Item>[] = [colMaterial, qtyGroup];
    render(<DataGrid data={items} columns={columns} />);

    // Open filter on Qty column
    const filterButton = screen.getByLabelText('Filter qty');
    fireEvent.click(filterButton);

    // Type a filter value
    const filterInput = screen.getByLabelText('Filter value for qty');
    fireEvent.change(filterInput, { target: { value: '24' } });

    // Only the row with qty=24 should remain
    expect(screen.getByText('PT-200')).toBeInTheDocument();
    expect(screen.queryByText('PT-100')).not.toBeInTheDocument();
  });

  it('mixed flat and grouped columns render correctly', () => {
    const qtyGroup: ColumnGroup<Item> = {
      groupId: 'quantity',
      header: 'Quantity',
      columns: [colQty, colUom],
    };
    // Material is flat, then a group, then nothing else
    const columns: AnyColumn<Item>[] = [colMaterial, colDescription, qtyGroup];
    render(<DataGrid data={items} columns={columns} />);

    // Should have 2 header rows (group row + leaf row)
    const rowgroup = screen.getByRole('rowgroup');
    const headerRows = within(rowgroup).getAllByRole('row');
    expect(headerRows).toHaveLength(2);

    // All leaf headers present
    expect(screen.getByText('Material')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Qty')).toBeInTheDocument();
    expect(screen.getByText('UoM')).toBeInTheDocument();
    // Group header present
    expect(screen.getByText('Quantity')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run src/components/DataGrid.columnGroups.test.tsx`
Expected: PASS — all 8 tests passing.

- [ ] **Step 3: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/DataGrid.columnGroups.test.tsx
git commit -m "test: add column groups integration tests"
```

---

## Task 6: Column group CSS

Add styles for the group header cell — spanning, centered text, distinct background, and a bottom border to visually separate group rows from leaf header rows.

**Files:**
- Modify: `src/strata.css`

- [ ] **Step 1: Add group header cell styles to `src/strata.css`**

Append the following CSS rules to the end of `src/strata.css`:

```css
/* Column group header cells */
.strata-group-header-cell {
  justify-content: center;
  text-align: center;
  background: #eaeaed;
  border-bottom: 1px solid #c7c7cc;
  font-weight: 600;
  font-size: 12px;
  color: #3a3a3c;
}

.strata-group-header-cell .strata-header-label {
  text-align: center;
  justify-content: center;
}
```

- [ ] **Step 2: Verify the build includes the new styles**

Run: `npm run build`
Expected: completes with no errors; `dist/strata.css` contains `.strata-group-header-cell`.

- [ ] **Step 3: Commit**

```bash
git add src/strata.css
git commit -m "style: add column group header cell styles"
```

---

## Task 7: Playground update and final verification

Update the playground to demonstrate column groups on the BOM data — "Identification" group over Material + Description, "Quantity" group over Qty + UoM. Run the full test suite, typecheck, and build to confirm everything works end-to-end.

**Files:**
- Modify: `playground/App.tsx`

- [ ] **Step 1: Replace `playground/App.tsx` entirely**

```tsx
import { DataGrid, type ColumnDef, type ColumnGroup, type AnyColumn, type TreeDataConfig } from '../src/index';
import '../src/strata.css';

/**
 * Throwaway dev playground for Strata.
 * Demonstrates column groups (stacked headers) on a BOM tree.
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

const colMaterial: ColumnDef<BomNode> = {
  id: 'material',
  header: 'Material',
  accessor: 'material',
  width: 150,
  isTreeColumn: true,
  pin: 'left',
  filter: 'text',
};

const colDescription: ColumnDef<BomNode> = {
  id: 'description',
  header: 'Description',
  accessor: 'description',
  width: 260,
  filter: 'text',
};

const colQty: ColumnDef<BomNode> = {
  id: 'qty',
  header: 'Qty',
  accessor: 'qty',
  width: 80,
  filter: 'number',
};

const colUom: ColumnDef<BomNode> = {
  id: 'uom',
  header: 'UoM',
  accessor: 'uom',
  width: 80,
};

// Column groups: "Identification" spans Material + Description,
// "Quantity" spans Qty + UoM
const identificationGroup: ColumnGroup<BomNode> = {
  groupId: 'identification',
  header: 'Identification',
  columns: [colMaterial, colDescription],
};

const quantityGroup: ColumnGroup<BomNode> = {
  groupId: 'quantity',
  header: 'Quantity',
  columns: [colQty, colUom],
};

const columns: AnyColumn<BomNode>[] = [identificationGroup, quantityGroup];

const treeData: TreeDataConfig<BomNode> = {
  getRowId: (r) => r.id,
  getChildren: (r) => r.children,
};

export function App() {
  return (
    <div style={{ padding: 32, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Strata — Plan 8 Playground</h1>
      <p style={{ color: '#86868b', fontSize: 14, margin: '0 0 20px' }}>
        Column groups (stacked headers) · "Identification" over Material+Description · "Quantity" over Qty+UoM · sorting · filtering · tree
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

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS — all tests pass.

- [ ] **Step 3: Run the type check**

Run: `npm run typecheck`
Expected: completes with no errors.

- [ ] **Step 4: Run the build**

Run: `npm run build`
Expected: completes with no errors; `dist/` contains all expected outputs. `index.d.ts` exports `ColumnGroup`, `AnyColumn`, `isColumnGroup`.

- [ ] **Step 5: Start the dev server and verify visually**

Run: `npm run dev`
Expected: The playground renders the BOM tree with:
- Two header rows: a group row ("Identification", "Quantity") and a leaf row (Material, Description, Qty, UoM)
- "Identification" header spans the width of Material + Description columns
- "Quantity" header spans the width of Qty + UoM columns
- Group headers have a slightly darker background and centered text
- Sorting still works (click leaf headers)
- Filtering still works (filter icons on leaf headers)
- Tree expand/collapse still works
- Material column is still pinned left

- [ ] **Step 6: Commit**

```bash
git add playground/App.tsx
git commit -m "feat: demo column groups in the BOM playground"
```

---

## Done — what Plan 8 delivers

`<DataGrid>` now supports column groups (stacked multi-row headers) for enterprise-grade table layouts:

- **Column groups:** Define `ColumnGroup<TRow>` entries with a `groupId`, `header`, and nested `columns` array. Groups create spanning header cells over their child columns.
- **Nested groups:** Groups can contain other groups, creating 3+ header rows. Each level gets its own header row with proper spanning.
- **Type-safe API:** The `columns` prop accepts `AnyColumn<TRow>[] = (ColumnDef<TRow> | ColumnGroup<TRow>)[]`. A `isColumnGroup()` type guard is exported for consumer use.
- **TanStack native:** Column groups map directly to TanStack Table's nested column format. `getHeaderGroups()` produces the multi-row header structure automatically.
- **Normalization layer:** `normalizeColumns()` converts the Strata column tree to TanStack format. `getLeafColumns()` extracts the flat leaf list for pinning, tree column resolution, and other operations.
- **Visual styling:** Group header cells (`.strata-group-header-cell`) have centered text, a distinct background, and proper border separation from leaf headers.
- **Backward compatible:** Flat `ColumnDef[]` arrays (no groups) continue to work exactly as before — single header row, no visual change.
- **No regressions:** All Plan 7 theming tests, Plan 6 selection tests, Plan 5 column management tests, Plan 4 sorting/filtering tests, Plan 3 tree tests, Plan 2 virtualization tests, and Plan 1 foundation tests continue to pass.

**Next:** Plan 9 — Row grouping & aggregation (group rows by column values, collapsible group headers, aggregate functions like sum/count/avg).
