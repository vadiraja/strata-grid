import type { Cell } from '@tanstack/react-table';
import { renderCellContent } from './render-cell-content';

export interface DataCellProps<TRow> {
  /** The TanStack cell to render. */
  cell: Cell<TRow, unknown>;
  /** Whether this cell is the active keyboard cell. */
  isFocused?: boolean;
  /** Stable active-descendant id when focused. */
  focusId?: string;
}

/** Renders a single ordinary body cell, delegating content rendering. */
export function DataCell<TRow>({
  cell,
  isFocused,
  focusId,
}: DataCellProps<TRow>) {
  const width = cell.column.getSize();
  return (
    <div
      className={`strata-cell${isFocused ? ' strata-cell-focused' : ''}`}
      role="gridcell"
      id={isFocused ? focusId : undefined}
      style={{ width, flex: `0 0 ${width}px` }}
    >
      {renderCellContent(cell)}
    </div>
  );
}
