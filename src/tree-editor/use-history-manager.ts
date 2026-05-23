import { useState, useCallback, useRef } from 'react';
import type { Command, TreeState } from './types';

export interface UseHistoryManagerOptions<TRow> {
  /** The initial tree state. */
  initialState: TreeState<TRow>;
  /** Maximum number of undo steps. Default: 50. */
  historyDepth?: number;
}

export interface HistoryManagerReturn<TRow> {
  /** Current tree state. */
  state: TreeState<TRow>;
  /** Execute a command: apply it and push to undo stack. */
  execute: (command: Command<TRow>) => void;
  /** Undo the last command. */
  undo: () => void;
  /** Redo the last undone command. */
  redo: () => void;
  /** Whether undo is available. */
  canUndo: boolean;
  /** Whether redo is available. */
  canRedo: boolean;
  /** The undo stack (most recent last). */
  undoStack: Command<TRow>[];
  /** The redo stack (most recent last). */
  redoStack: Command<TRow>[];
  /** Clear all history (preserves current state). */
  clear: () => void;
}

/**
 * Hook managing undo/redo history for tree commands.
 *
 * - Executing a command applies it and pushes to the undo stack.
 * - Undo reverses the last command and pushes to the redo stack.
 * - Redo re-applies the last undone command.
 * - Executing a new command clears the redo stack.
 * - History depth is enforced by dropping the oldest commands.
 */
export function useHistoryManager<TRow>(
  options: UseHistoryManagerOptions<TRow>,
): HistoryManagerReturn<TRow> {
  const { initialState, historyDepth = 50 } = options;

  const [state, setState] = useState<TreeState<TRow>>(initialState);
  const [undoStack, setUndoStack] = useState<Command<TRow>[]>([]);
  const [redoStack, setRedoStack] = useState<Command<TRow>[]>([]);

  const stateRef = useRef(state);
  stateRef.current = state;

  const execute = useCallback(
    (command: Command<TRow>) => {
      const newState = command.execute(stateRef.current);
      setState(newState);
      setUndoStack((prev) => {
        const next = [...prev, command];
        // Enforce depth limit
        if (next.length > historyDepth) {
          return next.slice(next.length - historyDepth);
        }
        return next;
      });
      setRedoStack([]);
    },
    [historyDepth],
  );

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const command = prev[prev.length - 1];
      const newState = command.undo(stateRef.current);
      setState(newState);
      setRedoStack((redo) => [...redo, command]);
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const command = prev[prev.length - 1];
      const newState = command.execute(stateRef.current);
      setState(newState);
      setUndoStack((undos) => [...undos, command]);
      return prev.slice(0, -1);
    });
  }, []);

  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return {
    state,
    execute,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoStack,
    redoStack,
    clear,
  };
}
