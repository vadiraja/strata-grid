import { useState, useCallback, useRef } from 'react';

export interface ActiveCell {
  rowId: string;
  columnId: string;
  originalValue: unknown;
  pendingValue: unknown;
}

export interface ActiveRow {
  rowId: string;
  originalValues: Map<string, unknown>;
  pendingValues: Map<string, unknown>;
}

export interface RowValidationSummary {
  hasInvalid: boolean;
  hasValidating: boolean;
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
  /** Called when a row edit starts. */
  onRowEditStart?: (event: { rowId: string }) => void;
  /** Called when a row edit ends. */
  onRowEditEnd?: (event: {
    rowId: string;
    changes: Record<string, { oldValue: unknown; newValue: unknown }>;
    committed: boolean;
  }) => void;
}

export interface EditStateReturn {
  /** The currently active (editing) cell, or null if idle. */
  activeCell: ActiveCell | null;
  /** The currently active row edit, or null if idle. */
  activeRow: ActiveRow | null;
  /** Start editing a cell. Auto-commits any previous active cell. */
  startEdit: (rowId: string, columnId: string, currentValue: unknown) => void;
  /** Start editing a whole row. Auto-commits any previous active edit. */
  startRowEdit: (rowId: string, values: Map<string, unknown>) => void;
  /** Update the pending value for the active cell. */
  setPendingValue: (value: unknown) => void;
  /** Update the pending value for one cell in the active row. */
  setRowPendingValue: (columnId: string, value: unknown) => void;
  /** Read the pending value for one cell in the active row. */
  getRowPendingValue: (columnId: string) => unknown;
  /** Commit the current edit. */
  commitEdit: () => void;
  /** Commit the current row edit. */
  commitRowEdit: () => void;
  /** Discard the current edit. */
  discardEdit: () => void;
  /** Discard the current row edit. */
  discardRowEdit: () => void;
  /** Update validation state for a cell in the active row. */
  setRowValidationState: (columnId: string, status: 'valid' | 'invalid' | 'validating') => void;
  /** Summarize validation state for the active row. */
  getRowValidationSummary: () => RowValidationSummary;
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
  const { onCellEditStart, onCellEditEnd, onRowEditStart, onRowEditEnd } = options;

  const [activeCell, setActiveCellState] = useState<ActiveCell | null>(null);
  const [activeRow, setActiveRowState] = useState<ActiveRow | null>(null);
  const [dirtyState, setDirtyState] = useState<Map<string, Map<string, unknown>>>(
    () => new Map(),
  );
  const [rowValidationState, setRowValidationStateMap] = useState<
    Map<string, 'valid' | 'invalid' | 'validating'>
  >(() => new Map());

  const activeCellRef = useRef<ActiveCell | null>(null);
  const activeRowRef = useRef<ActiveRow | null>(null);
  const rowValidationRef = useRef<Map<string, 'valid' | 'invalid' | 'validating'>>(
    new Map(),
  );

  /** Updates the active cell in both the synchronous ref and render state. */
  const setActive = useCallback((cell: ActiveCell | null) => {
    activeCellRef.current = cell;
    setActiveCellState(cell);
  }, []);

  const setActiveRow = useCallback((row: ActiveRow | null) => {
    activeRowRef.current = row;
    setActiveRowState(row);
    rowValidationRef.current = new Map();
    setRowValidationStateMap(new Map());
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

  const commitCurrentRow = useCallback(() => {
    const row = activeRowRef.current;
    if (!row) return;

    const changes: Record<string, { oldValue: unknown; newValue: unknown }> = {};
    row.pendingValues.forEach((newValue, columnId) => {
      const oldValue = row.originalValues.get(columnId);
      if (newValue !== oldValue) {
        changes[columnId] = { oldValue, newValue };
      }
    });

    onRowEditEnd?.({
      rowId: row.rowId,
      changes,
      committed: true,
    });

    if (Object.keys(changes).length > 0) {
      setDirtyState((prev) => {
        const next = new Map(prev);
        const rowMap = new Map(next.get(row.rowId) ?? []);
        Object.entries(changes).forEach(([columnId, change]) => {
          rowMap.set(columnId, change.newValue);
        });
        next.set(row.rowId, rowMap);
        return next;
      });
    }

    setActiveRow(null);
  }, [onRowEditEnd, setActiveRow]);

  const startEdit = useCallback(
    (rowId: string, columnId: string, currentValue: unknown) => {
      // Auto-commit previous cell if active
      if (activeCellRef.current) {
        commitCurrent();
      }
      if (activeRowRef.current) {
        commitCurrentRow();
      }

      onCellEditStart?.({ rowId, columnId, value: currentValue });

      setActive({
        rowId,
        columnId,
        originalValue: currentValue,
        pendingValue: currentValue,
      });
    },
    [commitCurrent, commitCurrentRow, onCellEditStart, setActive],
  );

  const startRowEdit = useCallback(
    (rowId: string, values: Map<string, unknown>) => {
      if (activeCellRef.current) {
        commitCurrent();
      }
      if (activeRowRef.current) {
        commitCurrentRow();
      }

      onRowEditStart?.({ rowId });
      setActiveRow({
        rowId,
        originalValues: new Map(values),
        pendingValues: new Map(values),
      });
    },
    [commitCurrent, commitCurrentRow, onRowEditStart, setActiveRow],
  );

  const setPendingValue = useCallback(
    (value: unknown) => {
      const cell = activeCellRef.current;
      if (!cell) return;
      setActive({ ...cell, pendingValue: value });
    },
    [setActive],
  );

  const setRowPendingValue = useCallback(
    (columnId: string, value: unknown) => {
      const row = activeRowRef.current;
      if (!row) return;

      const pendingValues = new Map(row.pendingValues);
      pendingValues.set(columnId, value);
      setActiveRow({ ...row, pendingValues });
    },
    [setActiveRow],
  );

  const getRowPendingValue = useCallback((columnId: string) => {
    const row = activeRowRef.current;
    return row?.pendingValues.get(columnId);
  }, []);

  const commitEdit = useCallback(() => {
    if (!activeCellRef.current) return;
    commitCurrent();
  }, [commitCurrent]);

  const commitRowEdit = useCallback(() => {
    if (!activeRowRef.current) return;
    const statuses = Array.from(rowValidationRef.current.values());
    if (statuses.includes('invalid') || statuses.includes('validating')) return;
    commitCurrentRow();
  }, [commitCurrentRow]);

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

  const discardRowEdit = useCallback(() => {
    const row = activeRowRef.current;
    if (!row) return;

    onRowEditEnd?.({
      rowId: row.rowId,
      changes: {},
      committed: false,
    });

    setActiveRow(null);
  }, [onRowEditEnd, setActiveRow]);

  const setRowValidationState = useCallback(
    (columnId: string, status: 'valid' | 'invalid' | 'validating') => {
      if (rowValidationRef.current.get(columnId) === status) return;

      const next = new Map(rowValidationRef.current);
      next.set(columnId, status);
      rowValidationRef.current = next;
      setRowValidationStateMap(next);
    },
    [],
  );

  const getRowValidationSummary = useCallback(() => {
    const statuses = Array.from(rowValidationState.values());
    return {
      hasInvalid: statuses.includes('invalid'),
      hasValidating: statuses.includes('validating'),
    };
  }, [rowValidationState]);

  const isDirty = useCallback(() => dirtyState.size > 0, [dirtyState]);

  const getDirtyState = useCallback(() => dirtyState, [dirtyState]);

  const clearDirtyState = useCallback(() => {
    setDirtyState(new Map());
  }, []);

  return {
    activeCell,
    activeRow,
    startEdit,
    startRowEdit,
    setPendingValue,
    setRowPendingValue,
    getRowPendingValue,
    commitEdit,
    commitRowEdit,
    discardEdit,
    discardRowEdit,
    setRowValidationState,
    getRowValidationSummary,
    isDirty,
    getDirtyState,
    clearDirtyState,
  };
}
