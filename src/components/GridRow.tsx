import type { CSSProperties, DragEvent } from 'react';
import type { Row, Cell } from '@tanstack/react-table';
import type { UseSelectionReturn } from '../model/use-selection';
import type { UseDragDropReturn } from '../tree-editor/use-drag-drop';
import { calculateDropPosition } from '../tree-editor/drop-position';
import { DataCell } from './DataCell';
import { TreeCell } from './TreeCell';
import { SelectionCell } from './SelectionCell';
import { DropIndicator } from './DropIndicator';

export interface GridRowProps<TRow> {
  /** The TanStack row to render. */
  row: Row<TRow>;
  /** Positioning style applied by the row virtualizer. */
  style?: CSSProperties;
  /** Id of the tree column. Set only in tree mode. */
  treeColumnId?: string;
  /**
   * Which cells to render. If omitted, renders all visible cells.
   * Used by the 3-pane layout to render only a subset (pinned or center).
   */
  cells?: Cell<TRow, unknown>[];
  /** Whether this component should expose the ARIA row role. */
  renderAsRow?: boolean;
  /** Selection state and actions. Present only when selection is enabled. */
  selection?: UseSelectionReturn;
  /** The active cell's column id for this row, if any. */
  focusedColumnId?: string;
  /** Stable active-descendant id when a cell in this row is focused. */
  focusId?: string;
  /** Column id that displays computed BOM extended quantities. */
  rollupTargetColumnId?: string;
  /** Extended quantities keyed by row id. */
  extendedQuantities?: Map<string, number>;
  /**
   * Drag-and-drop controller. When provided the row is draggable and emits
   * drag events to the controller; the matching drop indicator is rendered
   * when this row is the current target.
   */
  dragDrop?: UseDragDropReturn;
  /** Called when a cell in this row is selected/focused by pointer. */
  onCellFocus?: (columnId: string) => void;
  isInRange?: (columnId: string) => boolean;
  isRangeFocus?: (columnId: string) => boolean;
  onCellPointerDown?: (rowId: string, columnId: string, event: React.PointerEvent) => void;
  onCellPointerEnter?: (rowId: string, columnId: string, event: React.PointerEvent) => void;
  onCellContextMenu?: (rowId: string, columnId: string, event: React.MouseEvent) => void;
  /** Called before this row is expanded. */
  onRowExpand?: () => void;
}

/** Renders one body row as a horizontal strip of cells. */
export function GridRow<TRow>({
  row,
  style,
  treeColumnId,
  cells,
  renderAsRow = true,
  selection,
  focusedColumnId,
  focusId,
  rollupTargetColumnId,
  extendedQuantities,
  dragDrop,
  onCellFocus,
  isInRange,
  isRangeFocus,
  onCellPointerDown,
  onCellPointerEnter,
  onCellContextMenu,
  onRowExpand,
}: GridRowProps<TRow>) {
  const isTree = treeColumnId !== undefined;
  const cellsToRender = cells ?? row.getVisibleCells();
  const isSelected = selection?.isSelected(row.id) ?? false;
  const isIndeterminate = selection?.isIndeterminate(row.id) ?? false;
  const isDragSource = dragDrop?.dragState.sourceId === row.id;
  const isDropTarget = dragDrop?.dragState.targetId === row.id;

  const dragHandlers = dragDrop
    ? {
        draggable: true,
        onDragStart: (event: DragEvent<HTMLDivElement>) => {
          event.dataTransfer.effectAllowed = 'move';
          // Required by some browsers (Firefox) to actually start the drag.
          try {
            event.dataTransfer.setData('text/plain', row.id);
          } catch {
            /* ignored — jsdom or restrictive environments */
          }
          dragDrop.onDragStart(row.id);
        },
        onDragOver: (event: DragEvent<HTMLDivElement>) => {
          if (!dragDrop.dragState.sourceId) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = dragDrop.dragState.isValid
            ? 'move'
            : 'none';
          const rect = event.currentTarget.getBoundingClientRect();
          const pos = calculateDropPosition(
            event.clientY,
            rect.top,
            rect.height,
          );
          dragDrop.onDragOver(row.id, pos);
        },
        onDragLeave: () => dragDrop.onDragLeave(row.id),
        onDragEnd: () => dragDrop.onDragEnd(),
        onDrop: (event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          const pos =
            dragDrop.dragState.position ??
            (() => {
              const rect = event.currentTarget.getBoundingClientRect();
              return calculateDropPosition(
                event.clientY,
                rect.top,
                rect.height,
              );
            })();
          dragDrop.onDrop(row.id, pos);
        },
      }
    : null;

  const className = [
    'strata-row',
    isSelected && 'strata-row-selected',
    isDragSource && 'strata-row-dragging',
    isDropTarget && 'strata-row-drop-target',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      role={renderAsRow ? 'row' : undefined}
      style={style}
      aria-level={renderAsRow && isTree ? row.depth + 1 : undefined}
      aria-expanded={
        renderAsRow && isTree && row.getCanExpand()
          ? row.getIsExpanded()
          : undefined
      }
      aria-selected={renderAsRow && selection ? isSelected : undefined}
      {...dragHandlers}
    >
      {selection && (
        <SelectionCell
          checked={isSelected}
          indeterminate={isIndeterminate}
          onChange={(checked) => selection.toggleRow(row.id, checked)}
          rowId={row.id}
          isFocused={focusedColumnId === '__selection__'}
          focusId={focusId}
          onFocusCell={() => onCellFocus?.('__selection__')}
        />
      )}
      {cellsToRender.map((cell) => {
        const isFocused = focusedColumnId === cell.column.id;
        return cell.column.id === treeColumnId ? (
          <TreeCell
            key={cell.id}
            cell={cell}
            isFocused={isFocused}
            focusId={focusId}
            rollupTargetColumnId={rollupTargetColumnId}
            extendedQuantities={extendedQuantities}
            onFocusCell={() => onCellFocus?.(cell.column.id)}
            onToggleExpand={() => {
              if (!row.getIsExpanded()) onRowExpand?.();
            }}
          />
        ) : (
          <DataCell
            key={cell.id}
            cell={cell}
            isFocused={isFocused}
            focusId={focusId}
            rollupTargetColumnId={rollupTargetColumnId}
            extendedQuantities={extendedQuantities}
            onFocusCell={() => onCellFocus?.(cell.column.id)}
            isInRange={isInRange?.(cell.column.id)}
            isRangeFocus={isRangeFocus?.(cell.column.id)}
            onRangePointerDown={(event) => onCellPointerDown?.(row.id, cell.column.id, event)}
            onRangePointerEnter={(event) => onCellPointerEnter?.(row.id, cell.column.id, event)}
            onCellContextMenu={(event) => onCellContextMenu?.(row.id, cell.column.id, event)}
          />
        );
      })}
      {isDropTarget && dragDrop?.dragState.position && (
        <DropIndicator
          position={dragDrop.dragState.position}
          isValid={dragDrop.dragState.isValid}
        />
      )}
    </div>
  );
}
