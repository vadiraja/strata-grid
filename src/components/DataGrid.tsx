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
