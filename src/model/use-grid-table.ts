import { useMemo, useState } from 'react';
import {
  functionalUpdate,
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
  type ColumnFiltersState,
  type Updater,
} from '@tanstack/react-table';
import type {
  ColumnDef,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  ColumnSort,
} from './types';
import type { FilterExpression } from '../data/types';
import { normalizeColumns } from './normalize-columns';

export interface UseGridTableOptions<TRow> {
  /** The rows to display. In tree mode, the root rows. */
  data: TRow[];
  /** The column definitions. */
  columns: ColumnDef<TRow>[];
  /** Pre-normalized TanStack columns, including nested groups when present. */
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
  /** Called whenever sorting changes. */
  onSortChange?: (state: ColumnSort[]) => void;
  /** Called whenever column filters change. */
  onFilterChange?: (filters: FilterExpression[]) => void;
  /** Use server-provided sorted rows instead of client-side sorting. */
  manualSorting?: boolean;
  /** Use server-provided filtered rows instead of client-side filtering. */
  manualFiltering?: boolean;
  /** Whether the grid is in tree mode (enables filterFromLeafRows). */
  isTreeMode?: boolean;
  /**
   * Row grouping: column ids to group by, in nesting order.
   * Ignored by DataGrid when tree mode is active.
   */
  groupBy?: string[];
  /** Controlled column order. */
  columnOrder?: ColumnOrderState;
  /** Initial uncontrolled column order. */
  defaultColumnOrder?: ColumnOrderState;
  /** Called when column order changes. */
  onColumnOrderChange?: (state: ColumnOrderState) => void;
  /** Controlled column pinning. */
  columnPinning?: ColumnPinningState;
  /** Initial uncontrolled column pinning. */
  defaultColumnPinning?: ColumnPinningState;
  /** Called when column pinning changes. */
  onColumnPinningChange?: (state: ColumnPinningState) => void;
  /** Controlled column sizing. */
  columnSizing?: ColumnSizingState;
  /** Initial uncontrolled column sizing. */
  defaultColumnSizing?: ColumnSizingState;
  /** Called when column sizing changes. */
  onColumnSizingChange?: (state: ColumnSizingState) => void;
  /** Override whether a row can expand, useful for lazy trees. */
  getRowCanExpand?: (row: Row<TRow>) => boolean;
}

/**
 * Converts Strata's ColumnSort[] to TanStack's SortingState.
 */
function toTanstackSorting(sorts?: ColumnSort[]): TanstackSortingState {
  if (!sorts || sorts.length === 0) return [];
  return sorts.map((s) => ({ id: s.columnId, desc: s.direction === 'desc' }));
}

function fromTanstackSorting(sorts: TanstackSortingState): ColumnSort[] {
  return sorts.map((sort) => ({
    columnId: sort.id,
    direction: sort.desc ? 'desc' : 'asc',
  }));
}

function fromTanstackFilters(filters: ColumnFiltersState): FilterExpression[] {
  return filters.map((filter) => ({
    columnId: filter.id,
    operator: 'contains',
    value: filter.value,
  }));
}

function getPinningFromColumns<TRow>(
  columns: ColumnDef<TRow>[],
): Required<ColumnPinningState> {
  return {
    left: columns.filter((c) => c.pin === 'left').map((c) => c.id),
    right: columns.filter((c) => c.pin === 'right').map((c) => c.id),
  };
}

function normalizePinning(
  pinning: ColumnPinningState | undefined,
): Required<ColumnPinningState> {
  return {
    left: pinning?.left ?? [],
    right: pinning?.right ?? [],
  };
}

function applyUpdater<T>(updater: Updater<T>, previous: T): T {
  return functionalUpdate(updater, previous);
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
    tanstackColumns: providedTanstackColumns,
    getSubRows,
    getRowId,
    defaultExpanded,
    defaultSort,
    onSortChange,
    onFilterChange,
    manualSorting,
    manualFiltering,
    isTreeMode,
    groupBy,
    columnOrder: controlledColumnOrder,
    defaultColumnOrder,
    onColumnOrderChange,
    columnPinning: controlledColumnPinning,
    defaultColumnPinning,
    onColumnPinningChange,
    columnSizing: controlledColumnSizing,
    defaultColumnSizing,
    onColumnSizingChange,
    getRowCanExpand,
  } = options;

  const initialColumnOrder = useMemo(
    () => defaultColumnOrder ?? columns.map((column) => column.id),
    [columns, defaultColumnOrder],
  );
  const initialColumnPinning = useMemo(
    () =>
      normalizePinning(defaultColumnPinning ?? getPinningFromColumns(columns)),
    [columns, defaultColumnPinning],
  );

  const [internalColumnOrder, setInternalColumnOrder] =
    useState<ColumnOrderState>(initialColumnOrder);
  const [internalColumnPinning, setInternalColumnPinning] =
    useState<Required<ColumnPinningState>>(initialColumnPinning);
  const [internalColumnSizing, setInternalColumnSizing] =
    useState<ColumnSizingState>(defaultColumnSizing ?? {});
  const [sorting, setSorting] = useState<TanstackSortingState>(() =>
    toTanstackSorting(defaultSort),
  );
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const columnOrder = controlledColumnOrder ?? internalColumnOrder;
  const columnPinning = normalizePinning(
    controlledColumnPinning ?? internalColumnPinning,
  );
  const columnSizing = controlledColumnSizing ?? internalColumnSizing;
  const grouping = groupBy ?? [];
  const hasGrouping = grouping.length > 0;

  const tanstackColumns = useMemo<TanstackColumnDef<TRow>[]>(
    () => providedTanstackColumns ?? normalizeColumns(columns),
    [columns, providedTanstackColumns],
  );

  return useReactTable<TRow>({
    data,
    columns: tanstackColumns,
    getRowId,
    getSubRows,
    getRowCanExpand,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getFilteredRowModel: manualFiltering ? undefined : getFilteredRowModel(),
    ...(hasGrouping ? { getGroupedRowModel: getGroupedRowModel() } : {}),
    getExpandedRowModel: getExpandedRowModel(),
    filterFromLeafRows: isTreeMode ?? false,
    groupedColumnMode: false,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    state: {
      columnOrder,
      columnPinning,
      columnSizing,
      grouping,
      sorting,
      columnFilters,
    },
    manualSorting,
    manualFiltering,
    onSortingChange: (updater) => {
      const next = applyUpdater(updater, sorting);
      setSorting(next);
      onSortChange?.(fromTanstackSorting(next));
    },
    onColumnFiltersChange: (updater) => {
      const next = applyUpdater(updater, columnFilters);
      setColumnFilters(next);
      onFilterChange?.(fromTanstackFilters(next));
    },
    onColumnOrderChange: (updater) => {
      const next = applyUpdater(updater, columnOrder);
      if (controlledColumnOrder === undefined) {
        setInternalColumnOrder(next);
      }
      onColumnOrderChange?.(next);
    },
    onColumnPinningChange: (updater) => {
      const next = normalizePinning(applyUpdater(updater, columnPinning));
      if (controlledColumnPinning === undefined) {
        setInternalColumnPinning(next);
      }
      onColumnPinningChange?.(next);
    },
    onColumnSizingChange: (updater) => {
      const next = applyUpdater(updater, columnSizing);
      if (controlledColumnSizing === undefined) {
        setInternalColumnSizing(next);
      }
      onColumnSizingChange?.(next);
    },
    initialState: {
      expanded: defaultExpanded ? true : {},
    },
  });
}
