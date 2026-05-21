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
