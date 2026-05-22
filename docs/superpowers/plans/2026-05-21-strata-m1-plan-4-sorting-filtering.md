# Strata M1 · Plan 4 — Sorting & Filtering · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-column, tree-aware sorting and per-column filtering (text and number) to the grid. Sorting respects hierarchy — children sort within their parent, never above it. Filtering keeps ancestor rows visible so matching nodes remain reachable in the tree.

**Architecture:** TanStack Table's `getSortedRowModel` and `getFilteredRowModel` are wired into `useGridTable`. A `sortable` flag on `ColumnDef` controls which columns participate. Sorting is multi-column (shift-click adds a secondary sort). In tree mode, TanStack Table's built-in behavior sorts siblings within each parent — no custom comparator needed. Filtering uses a custom `filterFn` that, in tree mode, keeps a row visible if it matches OR any descendant matches (ancestor preservation). The header cell gains a clickable sort indicator and a filter input popover. State is uncontrolled by default (internal), with optional `defaultSort` seeding.

**Tech Stack:** TypeScript, React 18/19, `@tanstack/react-table` v8 (`getSortedRowModel`, `getFilteredRowModel`), `@tanstack/react-virtual` v3, tsup, Vitest + React Testing Library.

**Scope note:** This plan covers **sorting and column filtering only**. Column resize/reorder is **Plan 5**. Row selection is **Plan 6**. Advanced filter builder and global quick-search are **M4**.

**Spec:** `docs/superpowers/specs/2026-05-21-strata-tree-data-grid-design.md` (§5.4, §5.5, §10, §11). Builds directly on Plan 3 (`docs/superpowers/plans/2026-05-21-strata-m1-plan-3-tree-data.md`), merged to `master`.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/model/types.ts` | modify | Add `sortable`, `filter` to `ColumnDef`; add `SortDirection`, `SortingState`, `ColumnFilter` types |
| `src/model/tree-filter-fn.ts` | create | Custom filter function that preserves ancestor rows in tree mode |
| `src/model/tree-filter-fn.test.ts` | create | Tree filter function tests |
| `src/model/use-grid-table.ts` | modify | Wire `getSortedRowModel`, `getFilteredRowModel`, accept sort/filter config |
| `src/model/use-grid-table.test.ts` | modify | Add sorting and filtering tests |
| `src/components/SortIndicator.tsx` | create | Sort direction arrow indicator component |
| `src/components/FilterPopover.tsx` | create | Per-column filter input popover |
| `src/components/ColumnHeaderCell.tsx` | modify | Add sort click handler and filter trigger |
| `src/components/DataGrid.tsx` | modify | Add `defaultSort`, `sortable`, filter props |
| `src/components/DataGrid.sorting.test.tsx` | create | Sorting behavior tests (flat + tree) |
| `src/components/DataGrid.filtering.test.tsx` | create | Filtering behavior tests (flat + tree ancestor preservation) |
| `src/strata.css` | modify | Sort indicator, filter popover styles |
| `src/index.ts` | modify | Export new types |
| `playground/App.tsx` | modify | Demo sorting and filtering on the BOM |

---

## Task 1: Sorting & filtering types

Extend `ColumnDef` with sorting and filtering configuration, and add the supporting type definitions that the rest of the plan builds on.

**Files:**
- Modify: `src/model/types.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Replace `src/model/types.ts` entirely**

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

/** Sort direction for a column. */
export type SortDirection = 'asc' | 'desc';

/** A single column's sort specification. */
export interface ColumnSort {
  /** The column id to sort by. */
  columnId: string;
  /** The sort direction. */
  direction: SortDirection;
}

/** The complete sorting state — an ordered list of column sorts. */
export type SortingState = ColumnSort[];

/** Built-in filter types. */
export type FilterType = 'text' | 'number';

/**
 * Definition of a single grid column.
 *
 * Later milestones extend this interface with pinning and
 * column group options.
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
  /**
   * Marks this column as the tree column — the one that shows the hierarchy
   * (depth indentation and the expand/collapse control). Tree mode only;
   * exactly one column should set it. If none does, the first column is used
   * and a development warning is emitted.
   */
  isTreeColumn?: boolean;
  /**
   * Whether this column is sortable. Defaults to `true`.
   * Set to `false` to disable sorting for this column.
   */
  sortable?: boolean;
  /**
   * The filter type for this column. Set to `'text'` for case-insensitive
   * substring matching, `'number'` for numeric comparison, or `false` to
   * disable filtering. Defaults to `false` (no filter).
   */
  filter?: FilterType | false;
}

/**
 * Configures tree (hierarchical / BOM) mode. Passing `treeData` to
 * `<DataGrid>` turns it into a tree grid.
 *
 * Provide **either** `getChildren` (nested data) **or** `getParentId` (flat,
 * parent-pointer data). If both are given, `getChildren` wins and a
 * development warning is emitted.
 */
export interface TreeDataConfig<TRow> {
  /** Returns a stable, unique id for a row. */
  getRowId: (row: TRow) => string;
  /** Nested data: returns a row's children, or `undefined` for a leaf. */
  getChildren?: (row: TRow) => TRow[] | undefined;
  /**
   * Flat data: returns a row's parent id, or `null`/`undefined` for a root.
   */
  getParentId?: (row: TRow) => string | null | undefined;
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

- [ ] **Step 2: Replace `src/index.ts` entirely**

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
} from './model/types';
export { InMemoryDataSource } from './data/in-memory-data-source';
export type { DataSource } from './data/data-source';
```

- [ ] **Step 3: Verify types type-check**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 4: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — 57 tests, 12 files (unchanged from Plan 3).

- [ ] **Step 5: Commit**

```bash
git add src/model/types.ts src/index.ts
git commit -m "feat: add sorting and filtering types to ColumnDef"
```

---

## Task 2: Tree-aware filter function

The core filtering logic. In flat mode, a standard substring/number filter suffices. In tree mode, a row passes the filter if it matches OR if any of its descendants match — this keeps ancestor rows visible so matching nodes remain reachable in the tree. TanStack Table's `filterFromLeafRows` option handles this natively.

**Files:**
- Create: `src/model/tree-filter-fn.ts`
- Test: `src/model/tree-filter-fn.test.ts`

- [ ] **Step 1: Write the failing test — `src/model/tree-filter-fn.test.ts`**

```ts
import { textFilterFn, numberFilterFn } from './tree-filter-fn';

describe('textFilterFn', () => {
  it('matches when the value contains the filter string (case-insensitive)', () => {
    expect(textFilterFn('Hello World', 'world')).toBe(true);
  });

  it('does not match when the value does not contain the filter string', () => {
    expect(textFilterFn('Hello World', 'xyz')).toBe(false);
  });

  it('matches empty filter against any value', () => {
    expect(textFilterFn('anything', '')).toBe(true);
  });

  it('handles null and undefined values gracefully', () => {
    expect(textFilterFn(null, 'test')).toBe(false);
    expect(textFilterFn(undefined, 'test')).toBe(false);
  });

  it('coerces numbers to strings for matching', () => {
    expect(textFilterFn(42, '4')).toBe(true);
  });
});

describe('numberFilterFn', () => {
  it('matches when the numeric value equals the filter number', () => {
    expect(numberFilterFn(42, '42')).toBe(true);
  });

  it('matches when the value contains the filter as a substring of its string form', () => {
    expect(numberFilterFn(123, '12')).toBe(true);
  });

  it('does not match non-numeric values', () => {
    expect(numberFilterFn('abc', '1')).toBe(false);
  });

  it('handles null and undefined values gracefully', () => {
    expect(numberFilterFn(null, '1')).toBe(false);
    expect(numberFilterFn(undefined, '1')).toBe(false);
  });

  it('matches empty filter against any value', () => {
    expect(numberFilterFn(99, '')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/model/tree-filter-fn.test.ts`
Expected: FAIL — `Failed to resolve import "./tree-filter-fn"`.

- [ ] **Step 3: Create `src/model/tree-filter-fn.ts`**

```ts
/**
 * Text filter function: case-insensitive substring match.
 *
 * Returns `true` if the stringified cell value contains the filter text.
 * Null/undefined values never match (unless the filter is empty).
 * An empty filter matches everything.
 */
export function textFilterFn(cellValue: unknown, filterValue: string): boolean {
  if (filterValue === '') return true;
  if (cellValue == null) return false;
  return String(cellValue).toLowerCase().includes(filterValue.toLowerCase());
}

/**
 * Number filter function: matches if the numeric string representation
 * of the cell value contains the filter string.
 *
 * Returns `true` if the value is numeric and its string form contains
 * the filter text. Null/undefined or non-numeric values never match.
 * An empty filter matches everything.
 */
export function numberFilterFn(cellValue: unknown, filterValue: string): boolean {
  if (filterValue === '') return true;
  if (cellValue == null) return false;
  const num = Number(cellValue);
  if (Number.isNaN(num)) return false;
  return String(num).includes(filterValue);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/model/tree-filter-fn.test.ts`
Expected: PASS — 10 tests passing.

- [ ] **Step 5: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — 67 tests, 13 files.

- [ ] **Step 6: Commit**

```bash
git add src/model/tree-filter-fn.ts src/model/tree-filter-fn.test.ts
git commit -m "feat: add text and number filter functions"
```

---

## Task 3: Wire sorting into `useGridTable`

`useGridTable` gains `getSortedRowModel` and accepts sorting configuration. Columns are sortable by default (opt-out with `sortable: false`). The `enableSorting` per-column flag is derived from the Strata `ColumnDef.sortable` field. An optional `defaultSort` seeds the initial sorting state.

**Files:**
- Modify: `src/model/use-grid-table.ts`
- Modify: `src/model/use-grid-table.test.ts`

- [ ] **Step 1: Add sorting tests to `src/model/use-grid-table.test.ts`**

Append the following test block to the end of the file:

```ts
describe('useGridTable — sorting', () => {
  it('sorts rows ascending by a column when defaultSort is provided', () => {
    const unsorted: Material[] = [
      { id: 'M-2', name: 'Nut', qty: 8 },
      { id: 'M-1', name: 'Bolt', qty: 12 },
    ];
    const { result } = renderHook(() =>
      useGridTable({
        data: unsorted,
        columns,
        defaultSort: [{ columnId: 'name', direction: 'asc' }],
      }),
    );
    const names = result.current
      .getRowModel()
      .rows.map((r) => r.getValue('name'));
    expect(names).toEqual(['Bolt', 'Nut']);
  });

  it('sorts rows descending when direction is desc', () => {
    const { result } = renderHook(() =>
      useGridTable({
        data,
        columns,
        defaultSort: [{ columnId: 'name', direction: 'desc' }],
      }),
    );
    const names = result.current
      .getRowModel()
      .rows.map((r) => r.getValue('name'));
    expect(names).toEqual(['Nut', 'Bolt']);
  });

  it('disables sorting on a column with sortable: false', () => {
    const cols: ColumnDef<Material>[] = [
      { id: 'name', header: 'Name', accessor: 'name', sortable: false },
      { id: 'qty', header: 'Qty', accessor: 'qty' },
    ];
    const { result } = renderHook(() =>
      useGridTable({ data, columns: cols }),
    );
    const nameCol = result.current.getColumn('name');
    expect(nameCol?.getCanSort()).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify the new tests fail**

Run: `npx vitest run src/model/use-grid-table.test.ts`
Expected: FAIL — `defaultSort` is not yet accepted by `useGridTable`.

- [ ] **Step 3: Replace `src/model/use-grid-table.ts` entirely**

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
  type ColumnFiltersState,
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
    filterFromLeafRows: isTreeMode ?? false,
    initialState: {
      expanded: defaultExpanded ? true : {},
      sorting: toTanstackSorting(defaultSort),
    },
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/model/use-grid-table.test.ts`
Expected: PASS — 11 tests passing (5 original + 3 tree + 3 sorting).

- [ ] **Step 5: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — 70 tests, 13 files.

- [ ] **Step 6: Commit**

```bash
git add src/model/use-grid-table.ts src/model/use-grid-table.test.ts
git commit -m "feat: wire sorting and filtering models into useGridTable"
```

---

## Task 4: Sort indicator component

A small presentational component that renders the sort direction arrow in the column header. Shows ▲ for ascending, ▼ for descending, and nothing when unsorted.

**Files:**
- Create: `src/components/SortIndicator.tsx`

- [ ] **Step 1: Create `src/components/SortIndicator.tsx`**

```tsx
export interface SortIndicatorProps {
  /** Current sort direction, or false if unsorted. */
  direction: 'asc' | 'desc' | false;
}

/**
 * Renders a sort direction indicator in the column header.
 * Shows ▲ for ascending, ▼ for descending, nothing when unsorted.
 */
export function SortIndicator({ direction }: SortIndicatorProps) {
  if (!direction) return null;
  return (
    <span className="strata-sort-indicator" aria-hidden="true">
      {direction === 'asc' ? '▲' : '▼'}
    </span>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/SortIndicator.tsx
git commit -m "feat: add SortIndicator component"
```

---

## Task 5: Filter popover component

A per-column filter input that appears as a small popover below the header cell. For `'text'` filters it renders a text input; for `'number'` filters it renders a number input. The popover is toggled by a filter icon button in the header.

**Files:**
- Create: `src/components/FilterPopover.tsx`

- [ ] **Step 1: Create `src/components/FilterPopover.tsx`**

```tsx
import { useState, useRef, useEffect } from 'react';
import type { Column } from '@tanstack/react-table';
import type { FilterType } from '../model/types';

export interface FilterPopoverProps<TRow> {
  /** The TanStack column to filter. */
  column: Column<TRow, unknown>;
  /** The filter type — determines input type. */
  filterType: FilterType;
}

/**
 * A per-column filter input popover. Renders a text or number input
 * that sets the column's filter value on change.
 */
export function FilterPopover<TRow>({
  column,
  filterType,
}: FilterPopoverProps<TRow>) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const filterValue = (column.getFilterValue() as string) ?? '';

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  return (
    <span className="strata-filter-wrapper">
      <button
        type="button"
        className="strata-filter-button"
        aria-label={`Filter ${column.id}`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        {filterValue ? '⏚' : '▽'}
      </button>
      {open && (
        <div className="strata-filter-popover" role="dialog" aria-label="Column filter">
          <input
            ref={inputRef}
            className="strata-filter-input"
            type={filterType === 'number' ? 'number' : 'text'}
            placeholder={`Filter${filterType === 'number' ? ' (number)' : ''}…`}
            value={filterValue}
            onChange={(e) => column.setFilterValue(e.target.value || undefined)}
            aria-label={`Filter value for ${column.id}`}
          />
        </div>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/FilterPopover.tsx
git commit -m "feat: add FilterPopover component"
```

---

## Task 6: Interactive column header — sort click + filter trigger

`ColumnHeaderCell` becomes interactive: clicking the header text toggles sorting (single-click cycles asc → desc → none; shift-click adds a secondary sort column). If the column has a `filter` type, the filter icon and popover are rendered.

**Files:**
- Modify: `src/components/ColumnHeaderCell.tsx`

- [ ] **Step 1: Replace `src/components/ColumnHeaderCell.tsx` entirely**

```tsx
import type { Header } from '@tanstack/react-table';
import { SortIndicator } from './SortIndicator';
import { FilterPopover } from './FilterPopover';
import type { FilterType } from '../model/types';

export interface ColumnHeaderCellProps<TRow> {
  /** The TanStack header to render. */
  header: Header<TRow, unknown>;
}

/** Renders a single column header cell with sort and filter controls. */
export function ColumnHeaderCell<TRow>({ header }: ColumnHeaderCellProps<TRow>) {
  const strataColumn = header.column.columnDef.meta!.strataColumn;
  const width = header.getSize();
  const canSort = header.column.getCanSort();
  const sortDirection = header.column.getIsSorted();
  const filterType = strataColumn.filter as FilterType | false | undefined;

  const handleClick = (e: React.MouseEvent) => {
    if (!canSort) return;
    header.column.getToggleSortingHandler()?.(e);
  };

  return (
    <div
      className={`strata-header-cell${canSort ? ' strata-header-cell-sortable' : ''}`}
      role="columnheader"
      style={{ width }}
      onClick={handleClick}
      aria-sort={
        sortDirection === 'asc'
          ? 'ascending'
          : sortDirection === 'desc'
            ? 'descending'
            : undefined
      }
    >
      <span className="strata-header-label">
        {strataColumn.header}
      </span>
      {canSort && <SortIndicator direction={sortDirection} />}
      {filterType && filterType !== false && (
        <FilterPopover column={header.column} filterType={filterType} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 3: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — existing header tests still pass (they don't test sort/filter interaction yet).

- [ ] **Step 4: Commit**

```bash
git add src/components/ColumnHeaderCell.tsx
git commit -m "feat: add sort click and filter trigger to column headers"
```

---

## Task 7: Wire sorting and filtering into `DataGrid`

`DataGrid` gains a `defaultSort` prop and passes `isTreeMode` to `useGridTable` so filtering uses `filterFromLeafRows` in tree mode. The `sortable` and `filter` fields on columns flow through naturally via the column definitions.

**Files:**
- Modify: `src/components/DataGrid.tsx`

- [ ] **Step 1: Replace `src/components/DataGrid.tsx` entirely**

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
}

/** The public Strata grid component. */
export function DataGrid<TRow>({
  data,
  columns,
  height = DEFAULT_GRID_HEIGHT,
  treeData,
  defaultExpanded,
  defaultSort,
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

  const table = useGridTable({
    data: tree ? tree.rootRows : rows,
    columns,
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
Expected: PASS — all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/DataGrid.tsx
git commit -m "feat: wire defaultSort and tree-aware filtering into DataGrid"
```

---

## Task 8: Sorting integration tests

End-to-end tests for sorting behavior: clicking headers to sort, multi-column sort with shift-click, tree-aware sorting (children sort within their parent), and the `defaultSort` prop.

**Files:**
- Create: `src/components/DataGrid.sorting.test.tsx`

- [ ] **Step 1: Create `src/components/DataGrid.sorting.test.tsx`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Item {
  id: string;
  name: string;
  qty: number;
}

const items: Item[] = [
  { id: '1', name: 'Cherry', qty: 5 },
  { id: '2', name: 'Apple', qty: 12 },
  { id: '3', name: 'Banana', qty: 8 },
];

const columns: ColumnDef<Item>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'qty', header: 'Qty', accessor: 'qty' },
];

function getVisibleNames(): string[] {
  return screen
    .getAllByRole('gridcell')
    .filter((cell) => cell.textContent && !cell.textContent.match(/^\d+$/))
    .map((cell) => cell.textContent!);
}

describe('DataGrid — sorting', () => {
  it('renders unsorted by default', () => {
    render(<DataGrid data={items} columns={columns} />);
    expect(getVisibleNames()).toEqual(['Cherry', 'Apple', 'Banana']);
  });

  it('sorts ascending on first header click', () => {
    render(<DataGrid data={items} columns={columns} />);
    fireEvent.click(screen.getByText('Name'));
    expect(getVisibleNames()).toEqual(['Apple', 'Banana', 'Cherry']);
  });

  it('sorts descending on second header click', () => {
    render(<DataGrid data={items} columns={columns} />);
    fireEvent.click(screen.getByText('Name'));
    fireEvent.click(screen.getByText('Name'));
    expect(getVisibleNames()).toEqual(['Cherry', 'Banana', 'Apple']);
  });

  it('removes sort on third header click', () => {
    render(<DataGrid data={items} columns={columns} />);
    fireEvent.click(screen.getByText('Name'));
    fireEvent.click(screen.getByText('Name'));
    fireEvent.click(screen.getByText('Name'));
    expect(getVisibleNames()).toEqual(['Cherry', 'Apple', 'Banana']);
  });

  it('applies defaultSort on initial render', () => {
    render(
      <DataGrid
        data={items}
        columns={columns}
        defaultSort={[{ columnId: 'name', direction: 'asc' }]}
      />,
    );
    expect(getVisibleNames()).toEqual(['Apple', 'Banana', 'Cherry']);
  });

  it('sets aria-sort on the sorted column header', () => {
    render(
      <DataGrid
        data={items}
        columns={columns}
        defaultSort={[{ columnId: 'name', direction: 'asc' }]}
      />,
    );
    const header = screen.getByRole('columnheader', { name: /Name/ });
    expect(header).toHaveAttribute('aria-sort', 'ascending');
  });

  it('does not sort a column with sortable: false', () => {
    const cols: ColumnDef<Item>[] = [
      { id: 'name', header: 'Name', accessor: 'name', sortable: false },
      { id: 'qty', header: 'Qty', accessor: 'qty' },
    ];
    render(<DataGrid data={items} columns={cols} />);
    fireEvent.click(screen.getByText('Name'));
    // Order unchanged — sorting disabled
    expect(getVisibleNames()).toEqual(['Cherry', 'Apple', 'Banana']);
  });
});

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

const treeData: TreeNode[] = [
  {
    id: 'B',
    name: 'B-Assembly',
    children: [
      { id: 'B2', name: 'B2-Part' },
      { id: 'B1', name: 'B1-Part' },
    ],
  },
  {
    id: 'A',
    name: 'A-Assembly',
    children: [
      { id: 'A2', name: 'A2-Part' },
      { id: 'A1', name: 'A1-Part' },
    ],
  },
];

const treeCols: ColumnDef<TreeNode>[] = [
  { id: 'name', header: 'Name', accessor: 'name', isTreeColumn: true },
];

describe('DataGrid — tree-aware sorting', () => {
  it('sorts root siblings without moving children above parents', () => {
    render(
      <DataGrid
        data={treeData}
        columns={treeCols}
        treeData={{ getRowId: (r) => r.id, getChildren: (r) => r.children }}
        defaultExpanded
        defaultSort={[{ columnId: 'name', direction: 'asc' }]}
      />,
    );
    const cells = screen.getAllByRole('gridcell');
    const names = cells.map((c) => c.textContent);
    // A-Assembly comes first (sorted), then its children sorted
    expect(names).toEqual([
      'A-Assembly',
      'A1-Part',
      'A2-Part',
      'B-Assembly',
      'B1-Part',
      'B2-Part',
    ]);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/components/DataGrid.sorting.test.tsx`
Expected: PASS — 8 tests passing.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS — all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/DataGrid.sorting.test.tsx
git commit -m "test: add sorting integration tests (flat + tree)"
```

---

## Task 9: Filtering integration tests

End-to-end tests for filtering behavior: text filter, number filter, clearing a filter, and — critically — tree-mode ancestor preservation (a matching leaf keeps its parent chain visible).

**Files:**
- Create: `src/components/DataGrid.filtering.test.tsx`

- [ ] **Step 1: Create `src/components/DataGrid.filtering.test.tsx`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Item {
  id: string;
  name: string;
  qty: number;
}

const items: Item[] = [
  { id: '1', name: 'Bolt', qty: 12 },
  { id: '2', name: 'Nut', qty: 8 },
  { id: '3', name: 'Washer', qty: 24 },
];

const columns: ColumnDef<Item>[] = [
  { id: 'name', header: 'Name', accessor: 'name', filter: 'text' },
  { id: 'qty', header: 'Qty', accessor: 'qty', filter: 'number' },
];

describe('DataGrid — filtering', () => {
  it('renders a filter button for columns with a filter type', () => {
    render(<DataGrid data={items} columns={columns} />);
    expect(screen.getByLabelText('Filter name')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter qty')).toBeInTheDocument();
  });

  it('filters rows by text (case-insensitive substring)', () => {
    render(<DataGrid data={items} columns={columns} />);
    fireEvent.click(screen.getByLabelText('Filter name'));
    const input = screen.getByLabelText('Filter value for name');
    fireEvent.change(input, { target: { value: 'bol' } });
    expect(screen.getByText('Bolt')).toBeInTheDocument();
    expect(screen.queryByText('Nut')).not.toBeInTheDocument();
    expect(screen.queryByText('Washer')).not.toBeInTheDocument();
  });

  it('filters rows by number', () => {
    render(<DataGrid data={items} columns={columns} />);
    fireEvent.click(screen.getByLabelText('Filter qty'));
    const input = screen.getByLabelText('Filter value for qty');
    fireEvent.change(input, { target: { value: '24' } });
    expect(screen.getByText('Washer')).toBeInTheDocument();
    expect(screen.queryByText('Bolt')).not.toBeInTheDocument();
  });

  it('shows all rows when filter is cleared', () => {
    render(<DataGrid data={items} columns={columns} />);
    fireEvent.click(screen.getByLabelText('Filter name'));
    const input = screen.getByLabelText('Filter value for name');
    fireEvent.change(input, { target: { value: 'bol' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByText('Bolt')).toBeInTheDocument();
    expect(screen.getByText('Nut')).toBeInTheDocument();
    expect(screen.getByText('Washer')).toBeInTheDocument();
  });

  it('does not render a filter button for columns without filter', () => {
    const cols: ColumnDef<Item>[] = [
      { id: 'name', header: 'Name', accessor: 'name' },
    ];
    render(<DataGrid data={items} columns={cols} />);
    expect(screen.queryByLabelText('Filter name')).not.toBeInTheDocument();
  });
});

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

const treeRows: TreeNode[] = [
  {
    id: 'A',
    name: 'Assembly A',
    children: [
      { id: 'A1', name: 'Matching Part' },
      { id: 'A2', name: 'Other Part' },
    ],
  },
  {
    id: 'B',
    name: 'Assembly B',
    children: [{ id: 'B1', name: 'Unrelated' }],
  },
];

const treeCols: ColumnDef<TreeNode>[] = [
  { id: 'name', header: 'Name', accessor: 'name', isTreeColumn: true, filter: 'text' },
];

describe('DataGrid — tree-aware filtering (ancestor preservation)', () => {
  it('keeps ancestor rows visible when a descendant matches', () => {
    render(
      <DataGrid
        data={treeRows}
        columns={treeCols}
        treeData={{ getRowId: (r) => r.id, getChildren: (r) => r.children }}
        defaultExpanded
      />,
    );
    fireEvent.click(screen.getByLabelText('Filter name'));
    const input = screen.getByLabelText('Filter value for name');
    fireEvent.change(input, { target: { value: 'Matching' } });
    // The matching leaf is visible
    expect(screen.getByText('Matching Part')).toBeInTheDocument();
    // Its ancestor is preserved
    expect(screen.getByText('Assembly A')).toBeInTheDocument();
    // The non-matching sibling is hidden
    expect(screen.queryByText('Other Part')).not.toBeInTheDocument();
    // The entirely non-matching branch is hidden
    expect(screen.queryByText('Assembly B')).not.toBeInTheDocument();
  });

  it('shows all rows when tree filter is cleared', () => {
    render(
      <DataGrid
        data={treeRows}
        columns={treeCols}
        treeData={{ getRowId: (r) => r.id, getChildren: (r) => r.children }}
        defaultExpanded
      />,
    );
    fireEvent.click(screen.getByLabelText('Filter name'));
    const input = screen.getByLabelText('Filter value for name');
    fireEvent.change(input, { target: { value: 'Matching' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByText('Assembly A')).toBeInTheDocument();
    expect(screen.getByText('Assembly B')).toBeInTheDocument();
    expect(screen.getByText('Unrelated')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/components/DataGrid.filtering.test.tsx`
Expected: PASS — 7 tests passing.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS — all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/DataGrid.filtering.test.tsx
git commit -m "test: add filtering integration tests (flat + tree ancestor preservation)"
```

---

## Task 10: Sorting & filtering CSS

Styles for the sort indicator, the sortable header cell cursor, the filter button, and the filter popover.

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
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  font-weight: 600;
  background: #f5f5f7;
  border-bottom: 1px solid #d1d1d6;
  border-right: 1px solid #e5e5e7;
  overflow: hidden;
  white-space: nowrap;
  user-select: none;
}

.strata-header-cell-sortable {
  cursor: pointer;
}

.strata-header-cell-sortable:hover {
  background: #ededf0;
}

.strata-header-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.strata-sort-indicator {
  flex: none;
  font-size: 9px;
  color: #1d1d1f;
}

.strata-filter-wrapper {
  flex: none;
  position: relative;
}

.strata-filter-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: #86868b;
  font-size: 10px;
  cursor: pointer;
  border-radius: 3px;
}

.strata-filter-button:hover {
  background: #e0e0e3;
  color: #1d1d1f;
}

.strata-filter-popover {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 10;
  margin-top: 2px;
  padding: 6px;
  background: #fff;
  border: 1px solid #d1d1d6;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.strata-filter-input {
  width: 140px;
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid #d1d1d6;
  border-radius: 4px;
  outline: none;
}

.strata-filter-input:focus {
  border-color: #0071e3;
  box-shadow: 0 0 0 2px rgba(0, 113, 227, 0.2);
}

.strata-body {
  overflow-x: hidden;
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

.strata-tree-cell {
  display: flex;
  align-items: center;
  gap: 1px;
}

.strata-tree-indent {
  flex: none;
}

.strata-tree-toggle {
  flex: none;
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
}

.strata-tree-toggle-empty {
  cursor: default;
}

.strata-tree-label {
  flex: 1 1 auto;
  min-width: 0;
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

The changes from Plan 3: `.strata-header-cell` becomes a flex container with `gap`, gains a `user-select: none` and the `-sortable` modifier with hover. New rules: `.strata-header-label`, `.strata-sort-indicator`, `.strata-filter-wrapper`, `.strata-filter-button`, `.strata-filter-popover`, `.strata-filter-input`.

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: completes with no errors; `dist/strata.css` contains the new rules.

- [ ] **Step 3: Commit**

```bash
git add src/strata.css
git commit -m "style: add sort indicator and filter popover styles"
```

---

## Task 11: Playground update and final verification

Update the playground to demonstrate sorting and filtering on the BOM, and run the full verification pass.

**Files:**
- Modify: `playground/App.tsx`

- [ ] **Step 1: Replace `playground/App.tsx` entirely**

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
  { id: 'material', header: 'Material', accessor: 'material', width: 150, isTreeColumn: true, filter: 'text' },
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
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Strata — Plan 4 Playground</h1>
      <p style={{ color: '#86868b', fontSize: 14, margin: '0 0 20px' }}>
        Sorting (click headers) · filtering (▽ icon) · tree-aware
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
Expected: PASS — all tests pass (Plan 3's 57 + Plan 4's new tests).

- [ ] **Step 3: Run the type check**

Run: `npm run typecheck`
Expected: completes with no errors.

- [ ] **Step 4: Run the build**

Run: `npm run build`
Expected: completes with no errors; `dist/` contains `index.js`, `index.cjs`, `index.d.ts`, `index.d.cts`, `strata.css`. `index.d.ts` exports `SortDirection`, `ColumnSort`, `SortingState`, `FilterType`.

- [ ] **Step 5: Commit**

```bash
git add playground/App.tsx
git commit -m "feat: demo sorting and filtering in the BOM playground"
```

---

## Done — what Plan 4 delivers

`<DataGrid>` now supports multi-column sorting and per-column filtering. Key behaviors:

- **Sorting:** Click a column header to cycle through ascending → descending → unsorted. Shift-click adds a secondary sort. Columns are sortable by default; opt out with `sortable: false`. Seed initial sort with `defaultSort`.
- **Tree-aware sorting:** In tree mode, children sort within their parent — a child can never sort above its own parent. This is TanStack Table's native behavior with `getSubRows`.
- **Filtering:** Columns with `filter: 'text'` get a case-insensitive substring filter; `filter: 'number'` gets a numeric filter. A filter icon in the header opens a popover input.
- **Ancestor preservation:** In tree mode, when a deep node matches a filter, its ancestor rows stay visible so the match is reachable. Implemented via TanStack Table's `filterFromLeafRows`.
- **ARIA:** Sorted columns carry `aria-sort="ascending"` or `"descending"` on their header cell.
- **No regressions:** All Plan 3 tree tests, Plan 2 virtualization tests, and Plan 1 foundation tests continue to pass.

**Next:** Plan 5 — Column resize, reorder, and pinning (column virtualization for the center pane; pinned columns always rendered; drag-to-reorder; resize handles).
