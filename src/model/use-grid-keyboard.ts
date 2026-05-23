import { useCallback, useEffect, useState } from 'react';

export type GridCellPosition = [number, number];

export interface GridKeyboardOptions {
  /** Total number of body rows. */
  rowCount: number;
  /** Total number of visible columns, including selection column if present. */
  colCount: number;
  /** Optional initial active cell. */
  initialCell?: GridCellPosition;
  /** Called when Enter/Space toggles an expandable tree row. */
  onExpandToggle?: (rowIndex: number) => void;
  /** Called when Enter/Space toggles a selectable row. */
  onSelectionToggle?: (rowIndex: number) => void;
  /** Called when Enter activates the focused editable cell. */
  onCellActivate?: (rowIndex: number, colIndex: number) => void;
  /** Returns whether a column index is the tree column. */
  isTreeColumn?: (colIndex: number) => boolean;
  /** Returns whether a column index is the selection column. */
  isSelectionColumn?: (colIndex: number) => boolean;
  /**
   * Tree editor shortcuts — when supplied, the grid intercepts the
   * corresponding key combos and calls the handler with the current row.
   *
   * - `onIndent`: Tab — make the focused row a child of its previous sibling.
   * - `onOutdent`: Shift+Tab — make the focused row a sibling of its parent.
   * - `onReorderUp`: Ctrl/Cmd+Shift+ArrowUp — swap with previous sibling.
   * - `onReorderDown`: Ctrl/Cmd+Shift+ArrowDown — swap with next sibling.
   *
   * Handlers receive the focused row index. If a handler is omitted, the
   * key combo falls through to the browser (Tab default tab order, etc.).
   */
  onIndent?: (rowIndex: number) => void;
  onOutdent?: (rowIndex: number) => void;
  onReorderUp?: (rowIndex: number) => void;
  onReorderDown?: (rowIndex: number) => void;
  onDelete?: (rowIndex: number) => void;
}

export interface GridKeyboardReturn {
  /** Current active body cell as [rowIndex, colIndex]. */
  activeCell: GridCellPosition;
  /** Keyboard handler for the grid root. */
  handleKeyDown: (event: KeyboardEvent | React.KeyboardEvent) => void;
  /** Programmatic active-cell setter, clamped to grid bounds. */
  setActiveCell: (cell: GridCellPosition) => void;
}

function clampIndex(value: number, count: number) {
  if (count <= 0) return 0;
  return Math.max(0, Math.min(value, count - 1));
}

export function useGridKeyboard({
  rowCount,
  colCount,
  initialCell = [0, 0],
  onExpandToggle,
  onSelectionToggle,
  onCellActivate,
  isTreeColumn = () => false,
  isSelectionColumn = () => false,
  onIndent,
  onOutdent,
  onReorderUp,
  onReorderDown,
  onDelete,
}: GridKeyboardOptions): GridKeyboardReturn {
  const clamp = useCallback(
    (rowIndex: number, colIndex: number): GridCellPosition => [
      clampIndex(rowIndex, rowCount),
      clampIndex(colIndex, colCount),
    ],
    [colCount, rowCount],
  );

  const [activeCell, setActiveCellRaw] = useState<GridCellPosition>(() =>
    clamp(initialCell[0], initialCell[1]),
  );

  useEffect(() => {
    setActiveCellRaw((current) => clamp(current[0], current[1]));
  }, [clamp]);

  const setActiveCell = useCallback(
    (cell: GridCellPosition) => {
      setActiveCellRaw(clamp(cell[0], cell[1]));
    },
    [clamp],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent | React.KeyboardEvent) => {
      const ctrl = event.ctrlKey || event.metaKey;
      let handled = true;

      switch (event.key) {
        case 'ArrowRight':
          setActiveCellRaw((current) => clamp(current[0], current[1] + 1));
          break;
        case 'ArrowLeft':
          setActiveCellRaw((current) => clamp(current[0], current[1] - 1));
          break;
        case 'ArrowDown':
          if (ctrl && event.shiftKey && onReorderDown) {
            onReorderDown(activeCell[0]);
          } else {
            setActiveCellRaw((current) => clamp(current[0] + 1, current[1]));
          }
          break;
        case 'ArrowUp':
          if (ctrl && event.shiftKey && onReorderUp) {
            onReorderUp(activeCell[0]);
          } else {
            setActiveCellRaw((current) => clamp(current[0] - 1, current[1]));
          }
          break;
        case 'Tab':
          if (event.shiftKey && onOutdent) {
            onOutdent(activeCell[0]);
          } else if (!event.shiftKey && onIndent) {
            onIndent(activeCell[0]);
          } else {
            handled = false;
          }
          break;
        case 'Home':
          setActiveCellRaw((current) => (ctrl ? [0, 0] : [current[0], 0]));
          break;
        case 'End':
          setActiveCellRaw((current) =>
            ctrl ? clamp(rowCount - 1, colCount - 1) : clamp(current[0], colCount - 1),
          );
          break;
        case 'Enter':
          if (isSelectionColumn(activeCell[1])) {
            onSelectionToggle?.(activeCell[0]);
          } else if (isTreeColumn(activeCell[1])) {
            onExpandToggle?.(activeCell[0]);
          } else {
            onCellActivate?.(activeCell[0], activeCell[1]);
          }
          break;
        case ' ':
          if (isSelectionColumn(activeCell[1])) {
            onSelectionToggle?.(activeCell[0]);
          } else if (isTreeColumn(activeCell[1])) {
            onExpandToggle?.(activeCell[0]);
          } else {
            handled = false;
          }
          break;
        case 'Delete':
        case 'Backspace':
          if (onDelete) {
            onDelete(activeCell[0]);
          } else {
            handled = false;
          }
          break;
        default:
          handled = false;
      }

      if (handled) {
        event.preventDefault();
      }
    },
    [
      activeCell,
      clamp,
      colCount,
      isSelectionColumn,
      isTreeColumn,
      onExpandToggle,
      onCellActivate,
      onSelectionToggle,
      onIndent,
      onOutdent,
      onReorderUp,
      onReorderDown,
      onDelete,
      rowCount,
    ],
  );

  return { activeCell, handleKeyDown, setActiveCell };
}
