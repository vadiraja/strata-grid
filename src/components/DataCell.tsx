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
  /** Called when this cell is selected/focused by pointer. */
  onFocusCell?: () => void;
  /** Whether this cell is inside the active selection range. */
  isInRange?: boolean;
  /** Whether this cell is the focus (anchor end) of the active range. */
  isRangeFocus?: boolean;
  /** Called on pointer down (left button, no Shift). Starts a new range. */
  onRangePointerDown?: (event: React.PointerEvent) => void;
  /** Called on pointer enter while the pointer is down. Extends the range. */
  onRangePointerEnter?: (event: React.PointerEvent) => void;
  /** Called on right-click. */
  onCellContextMenu?: (event: React.MouseEvent) => void;
  /** Whether this cell is currently in its post-update flash window. */
  isFlashing?: boolean;
}

/** Renders a single ordinary body cell, delegating content rendering. */
export function DataCell<TRow>({
  cell,
  isFocused,
  focusId,
  rollupTargetColumnId,
  extendedQuantities,
  onFocusCell,
  isInRange,
  isRangeFocus,
  onRangePointerDown,
  onRangePointerEnter,
  onCellContextMenu,
  isFlashing,
}: DataCellProps<TRow>) {
  const width = cell.column.getSize();
  const editCtx = useEditContext();
  const colDef = cell.column.columnDef.meta?.strataColumn;
  const userClass = colDef?.cellClass?.({
    row: cell.row.original,
    value: cell.getValue(),
    column: colDef,
    rowIndex: cell.row.index,
  });
  const userStyle = colDef?.cellStyle?.({
    row: cell.row.original,
    value: cell.getValue(),
    column: colDef,
    rowIndex: cell.row.index,
  });

  const gateOn = editCtx?.editingEnabled ?? true;
  const isEditable = Boolean(
    editCtx &&
      gateOn &&
      colDef?.editable &&
      (typeof colDef.editable === 'function'
        ? colDef.editable(cell.row.original)
        : colDef.editable),
  );
  const showIndicator = isEditable && (editCtx?.config.showEditableIndicator ?? true);

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
    onFocusCell?.();
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
    showIndicator && 'strata-cell-editable',
    isEditing && 'strata-cell-editing',
    isRowEditing && 'strata-cell-row-editing',
    isInRange && 'strata-cell-in-range',
    isRangeFocus && 'strata-cell-range-focus',
    isFlashing && 'strata-cell-flash',
    userClass,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      role="gridcell"
      id={isFocused ? focusId : undefined}
      data-strata-cell-row={cell.row.id}
      data-strata-cell-column={cell.column.id}
      style={{ width, flex: `0 0 ${width}px`, ...userStyle }}
      onClick={handleClick}
      onDoubleClick={editCtx ? handleDoubleClick : undefined}
      onPointerDown={onRangePointerDown}
      onPointerEnter={onRangePointerEnter}
      onContextMenu={onCellContextMenu}
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
