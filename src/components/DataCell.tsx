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
  /** Column id that displays computed BOM extended quantities. */
  rollupTargetColumnId?: string;
  /** Extended quantities keyed by row id. */
  extendedQuantities?: Map<string, number>;
}

/** Renders a single ordinary body cell, delegating content rendering. */
export function DataCell<TRow>({
  cell,
  isFocused,
  focusId,
  rollupTargetColumnId,
  extendedQuantities,
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
  const activeRow = editCtx?.editState.activeRow;
  const isRowEditing = activeRow != null && activeRow.rowId === cell.row.id && isEditable;
  const isEditing =
    (activeCell != null &&
      activeCell.rowId === cell.row.id &&
      activeCell.columnId === cell.column.id) ||
    isRowEditing;

  const handleDoubleClick = () => {
    if (!editCtx) return;
    const { config, editState } = editCtx;
    // Plan 1 only wires double-click activation.
    if (config.activateOn !== 'doubleClick' && config.activateOn !== undefined) {
      return;
    }
    if (!isEditable) return;
    if (config.mode === 'row') {
      const values = new Map(
        cell.row
          .getVisibleCells()
          .filter((visibleCell) => {
            const column = visibleCell.column.columnDef.meta?.strataColumn;
            if (!column?.editable) return false;
            return typeof column.editable === 'function'
              ? column.editable(cell.row.original)
              : column.editable;
          })
          .map((visibleCell) => [visibleCell.column.id, visibleCell.getValue()]),
      );
      editState.startRowEdit(cell.row.id, values);
      return;
    }
    editState.startEdit(cell.row.id, cell.column.id, cell.getValue());
  };
  const handleClick = () => {
    if (!editCtx) return;
    if (editCtx.config.activateOn !== 'singleClick') return;
    if (!isEditable) return;
    if (editCtx.config.mode === 'row') {
      return;
    }
    editCtx.editState.startEdit(cell.row.id, cell.column.id, cell.getValue());
  };

  const className = [
    'strata-cell',
    isFocused && 'strata-cell-focused',
    isEditable && 'strata-cell-editable',
    isEditing && 'strata-cell-editing',
    isRowEditing && 'strata-cell-row-editing',
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
      {isEditing ? (
        <CellEditor cell={cell} />
      ) : cell.column.id === rollupTargetColumnId &&
        extendedQuantities?.has(cell.row.id) ? (
        extendedQuantities.get(cell.row.id)
      ) : (
        renderCellContent(cell)
      )}
    </div>
  );
}
