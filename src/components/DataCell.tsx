import type { Cell } from '@tanstack/react-table';
import { renderCellContent } from './render-cell-content';
import { useEditContext } from '../model/edit-context';
import { CellEditor } from './editors';

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
  const colDef = cell.column.columnDef.meta?.strataColumn;

  const isEditable = Boolean(
    editCtx &&
      colDef?.editable &&
      (typeof colDef.editable === 'function'
        ? colDef.editable(cell.row.original)
        : colDef.editable),
  );

  const activeCell = editCtx?.editState.activeCell;
  const isEditing =
    activeCell != null &&
    activeCell.rowId === cell.row.id &&
    activeCell.columnId === cell.column.id;

  const handleDoubleClick = () => {
    if (!editCtx) return;
    const { config, editState } = editCtx;
    // Plan 1 only wires double-click activation.
    if (config.activateOn !== 'doubleClick' && config.activateOn !== undefined) {
      return;
    }
    if (!isEditable) return;
    editState.startEdit(cell.row.id, cell.column.id, cell.getValue());
  };
  const handleClick = () => {
    if (!editCtx) return;
    if (editCtx.config.activateOn !== 'singleClick') return;
    if (!isEditable) return;
    editCtx.editState.startEdit(cell.row.id, cell.column.id, cell.getValue());
  };

  const className = [
    'strata-cell',
    isFocused && 'strata-cell-focused',
    isEditable && 'strata-cell-editable',
    isEditing && 'strata-cell-editing',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      role="gridcell"
      id={isFocused ? focusId : undefined}
      style={{ width, flex: `0 0 ${width}px` }}
      onClick={editCtx ? handleClick : undefined}
      onDoubleClick={editCtx ? handleDoubleClick : undefined}
    >
      {isEditing ? <CellEditor cell={cell} /> : renderCellContent(cell)}
    </div>
  );
}
