import type { Cell } from '@tanstack/react-table';
import type { ReactNode } from 'react';

/**
 * Produces the display content for a body cell: the column's custom renderer
 * if it defines one, otherwise the stringified accessor value (`null` and
 * `undefined` render as empty).
 *
 * Shared by `DataCell` and `TreeCell` so cell content renders identically in
 * ordinary and tree-column cells.
 */
export function renderCellContent<TRow>(cell: Cell<TRow, unknown>): ReactNode {
  const strataColumn = cell.column.columnDef.meta!.strataColumn;
  const value = cell.getValue();
  if (strataColumn.cell) {
    return strataColumn.cell({
      row: cell.row.original,
      value,
      column: strataColumn,
      rowIndex: cell.row.index,
    });
  }
  return value == null ? '' : String(value);
}
