import type { Table } from '@tanstack/react-table';
import { GridRow } from './GridRow';

export interface BodyViewportProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
}

/** Renders the grid body — one GridRow per row, or an empty message. */
export function BodyViewport<TRow>({ table }: BodyViewportProps<TRow>) {
  const rows = table.getRowModel().rows;

  if (rows.length === 0) {
    return (
      <div className="strata-body strata-body-empty" role="rowgroup">
        <div className="strata-empty">No data</div>
      </div>
    );
  }

  return (
    <div className="strata-body" role="rowgroup">
      {rows.map((row) => (
        <GridRow key={row.id} row={row} />
      ))}
    </div>
  );
}
