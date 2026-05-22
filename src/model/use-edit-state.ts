import { useState, useCallback, useRef } from 'react';

export interface ActiveCell {
  rowId: string;
  columnId: string;
  originalValue: unknown;
  pendingValue: unknown;
}

export interface EditStateOptions {
  /** Edit mode: 'cell' or 'row'. */
  mode: 'cell' | 'row';
  /** Called when a cell edit starts. */
  onCellEditStart?: (event: { rowId: string; columnId: string; value: unknown }) => void;
  /** Called when a cell edit ends. */
  onCellEditEnd?: (event: {
    rowId: string;
    columnId: string;
    value: unknown;
    newValue: unknown;
    committed: boolean;
  }) => void;
}

export interface EditStateReturn {
  /** The currently active (editing) cell, or null if idle. */
  activeCell: ActiveCell | null;
  /** Start editing a cell. Auto-commits any previous active cell. */
  startEdit: (rowId: string, columnId: string, currentValue: unknown) => void;
  /** Update the pending value for the active cell. */
  setPendingValue: (value: unknown) => void;
  /** Commit the current edit. */
  commitEdit: () => void;
  /** Discard the current edit. */
  discardEdit: () => void;
  /** Whether any cells have uncommitted changes. */
  isDirty: () => boolean;
  /** Get all dirty cells: rowId → columnId → newValue. */
  getDirtyState: () => Map<string, Map<string, unknown>>;
  /** Clear all dirty state (e.g., after a successful save). */
  clearDirtyState: () => void;
}

/**
 * Hook managing the cell editing state machine.
 *
 * Lifecycle: idle → active (startEdit) → committing/discarding → idle
 *
 * When a new edit starts while another is active, the previous edit is
 * auto-committed (if the value changed) before the new one begins.
 *
 * The active cell is tracked in a ref as well as state: the ref is the
 * synchronous source of truth, so a sequence of operations dispatched
 * within a single React batch (e.g. `startEdit` then `commitEdit`) always
 * sees fresh state. The state copy drives rendering.
 */
export function useEditState(options: EditStateOptions): EditStateReturn {
  const { onCellEditStart, onCellEditEnd } = options;

  const [activeCell, setActiveCellState] = useState<ActiveCell | null>(null);
  const [dirtyState, setDirtyState] = useState<Map<string, Map<string, unknown>>>(
    () => new Map(),
  );

  const activeCellRef = useRef<ActiveCell | null>(null);

  /** Updates the active cell in both the synchronous ref and render state. */
  const setActive = useCallback((cell: ActiveCell | null) => {
    activeCellRef.current = cell;
    setActiveCellState(cell);
  }, []);

  const commitCurrent = useCallback(() => {
    const cell = activeCellRef.current;
    if (!cell) return;

    onCellEditEnd?.({
      rowId: cell.rowId,
      columnId: cell.columnId,
      value: cell.originalValue,
      newValue: cell.pendingValue,
      committed: true,
    });

    // Add to dirty state only if value actually changed
    if (cell.pendingValue !== cell.originalValue) {
      setDirtyState((prev) => {
        const next = new Map(prev);
        const rowMap = new Map(next.get(cell.rowId) ?? []);
        rowMap.set(cell.columnId, cell.pendingValue);
        next.set(cell.rowId, rowMap);
        return next;
      });
    }

    setActive(null);
  }, [onCellEditEnd, setActive]);

  const startEdit = useCallback(
    (rowId: string, columnId: string, currentValue: unknown) => {
      // Auto-commit previous cell if active
      if (activeCellRef.current) {
        commitCurrent();
      }

      onCellEditStart?.({ rowId, columnId, value: currentValue });

      setActive({
        rowId,
        columnId,
        originalValue: currentValue,
        pendingValue: currentValue,
      });
    },
    [commitCurrent, onCellEditStart, setActive],
  );

  const setPendingValue = useCallback(
    (value: unknown) => {
      const cell = activeCellRef.current;
      if (!cell) return;
      setActive({ ...cell, pendingValue: value });
    },
    [setActive],
  );

  const commitEdit = useCallback(() => {
    if (!activeCellRef.current) return;
    commitCurrent();
  }, [commitCurrent]);

  const discardEdit = useCallback(() => {
    const cell = activeCellRef.current;
    if (!cell) return;

    onCellEditEnd?.({
      rowId: cell.rowId,
      columnId: cell.columnId,
      value: cell.originalValue,
      newValue: cell.pendingValue,
      committed: false,
    });

    setActive(null);
  }, [onCellEditEnd, setActive]);

  const isDirty = useCallback(() => dirtyState.size > 0, [dirtyState]);

  const getDirtyState = useCallback(() => dirtyState, [dirtyState]);

  const clearDirtyState = useCallback(() => {
    setDirtyState(new Map());
  }, []);

  return {
    activeCell,
    startEdit,
    setPendingValue,
    commitEdit,
    discardEdit,
    isDirty,
    getDirtyState,
    clearDirtyState,
  };
}
