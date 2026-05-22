import type { Cell } from '@tanstack/react-table';
import { renderCellContent } from './render-cell-content';
import { useEditContext } from '../model/edit-context';

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
  const editCtx = useEditContext();

  const handleDoubleClick = () => {
    if (!editCtx) return;
    const { config, editState } = editCtx;
    // Plan 1 only wires double-click activation.
    if (config.activateOn !== 'doubleClick' && config.activateOn !== undefined) {
      return;
    }
    const colDef = cell.column.columnDef.meta?.strataColumn;
    if (!colDef?.editable) return;
    if (
      typeof colDef.editable === 'function' &&
      !colDef.editable(cell.row.original)
    ) {
      return;
    }
    editState.startEdit(cell.row.id, cell.column.id, cell.getValue());
  };

  return (
    <div
      className={`strata-cell${isFocused ? ' strata-cell-focused' : ''}`}
      role="gridcell"
      id={isFocused ? focusId : undefined}
      style={{ width, flex: `0 0 ${width}px` }}
      onDoubleClick={editCtx ? handleDoubleClick : undefined}
    >
      {renderCellContent(cell)}
    </div>
  );
}
