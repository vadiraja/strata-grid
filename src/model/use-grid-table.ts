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
        enablePinning: true,
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
