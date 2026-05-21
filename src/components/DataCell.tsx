import type { Cell } from '@tanstack/react-table';
import { renderCellContent } from './render-cell-content';

export interface DataCellProps<TRow> {
  /** The TanStack cell to render. */
  cell: Cell<TRow, unknown>;
}

/** Renders a single ordinary body cell, delegating content rendering. */
export function DataCell<TRow>({ cell }: DataCellProps<TRow>) {
  const width = cell.column.getSize();
  return (
    <div className="strata-cell" role="gridcell" style={{ width }}>
      {renderCellContent(cell)}
    </div>
  );
}
