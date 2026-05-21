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
