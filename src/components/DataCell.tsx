import type { Cell } from '@tanstack/react-table';
import type { ReactNode } from 'react';

export interface DataCellProps<TRow> {
  /** The TanStack cell to render. */
  cell: Cell<TRow, unknown>;
}

/** Renders a single body cell, delegating to the column's custom renderer. */
export function DataCell<TRow>({ cell }: DataCellProps<TRow>) {
  const strataColumn = cell.column.columnDef.meta!.strataColumn;
  const value = cell.getValue();
  const width = cell.column.getSize();

  let content: ReactNode;
  if (strataColumn.cell) {
    content = strataColumn.cell({
      row: cell.row.original,
      value,
      column: strataColumn,
      rowIndex: cell.row.index,
    });
  } else {
    content = value == null ? '' : String(value);
  }

  return (
    <div className="strata-cell" role="gridcell" style={{ width }}>
      {content}
    </div>
  );
}
