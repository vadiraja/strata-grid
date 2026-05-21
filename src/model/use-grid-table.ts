import { useMemo } from 'react';
import {
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ColumnDef as TanstackColumnDef,
  type Row,
  type Table,
} from '@tanstack/react-table';
import type { ColumnDef } from './types';
import { readValue } from './read-value';
import { DEFAULT_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from './constants';

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
}

/**
 * Builds a TanStack Table instance from Strata column definitions.
 *
 * Each Strata column is carried on its TanStack column via `meta.strataColumn`.
 * The expanded row model is always installed: with no `getSubRows` it is
 * identical to the core model (flat grids are unaffected); with `getSubRows`
 * it flattens only the currently-expanded rows. Expansion state is managed
 * internally by TanStack Table and seeded by `defaultExpanded`.
 */
export function useGridTable<TRow>(
  options: UseGridTableOptions<TRow>,
): Table<TRow> {
  const { data, columns, getSubRows, getRowId, defaultExpanded } = options;

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
    getRowId,
    getSubRows,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    initialState: { expanded: defaultExpanded ? true : {} },
  });
}
