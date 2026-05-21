import type { Row } from '@tanstack/react-table';
import { DataCell } from './DataCell';

export interface GridRowProps<TRow> {
  /** The TanStack row to render. */
  row: Row<TRow>;
}

/** Renders one body row as a horizontal strip of cells. */
export function GridRow<TRow>({ row }: GridRowProps<TRow>) {
  return (
    <div className="strata-row" role="row">
      {row.getVisibleCells().map((cell) => (
        <DataCell key={cell.id} cell={cell} />
      ))}
    </div>
  );
}
