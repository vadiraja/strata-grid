import { useCallback, useRef, useState } from 'react';
import type { CellEditDelta } from './types';

export interface CellTransaction { rowId: string; edits: CellEditDelta[]; }
interface ApplyArg extends CellTransaction { source: 'undo' | 'redo'; }

export function useCellHistory(opts: { apply: (t: ApplyArg) => void; depth?: number }) {
  const depth = opts.depth ?? 50;
  const [undoStack, setUndoStack] = useState<CellTransaction[]>([]);
  const [redoStack, setRedoStack] = useState<CellTransaction[]>([]);
  const applyRef = useRef(opts.apply);
  applyRef.current = opts.apply;

  // Mirror the stacks in refs so undo/redo can read the latest value
  // synchronously and call the side-effecting `apply` OUTSIDE of any state
  // updater. Calling `apply` inside a setState updater would run it during
  // render (updaters must be pure), which triggers a "setState while rendering"
  // warning when `apply` writes to other components' state.
  const undoRef = useRef<CellTransaction[]>([]);
  const redoRef = useRef<CellTransaction[]>([]);

  const commitStacks = (nextUndo: CellTransaction[], nextRedo: CellTransaction[]) => {
    undoRef.current = nextUndo;
    redoRef.current = nextRedo;
    setUndoStack(nextUndo);
    setRedoStack(nextRedo);
  };

  const record = useCallback((t: CellTransaction) => {
    const next = [...undoRef.current, t];
    const trimmed = next.length > depth ? next.slice(next.length - depth) : next;
    commitStacks(trimmed, []);
  }, [depth]);

  const undo = useCallback(() => {
    const stack = undoRef.current;
    if (stack.length === 0) return;
    const t = stack[stack.length - 1];
    commitStacks(stack.slice(0, -1), [...redoRef.current, t]);
    // Side effect runs AFTER state updates, never inside an updater.
    applyRef.current({
      rowId: t.rowId,
      edits: t.edits.map((e) => ({ columnId: e.columnId, oldValue: e.newValue, newValue: e.oldValue })),
      source: 'undo',
    });
  }, []);

  const redo = useCallback(() => {
    const stack = redoRef.current;
    if (stack.length === 0) return;
    const t = stack[stack.length - 1];
    commitStacks([...undoRef.current, t], stack.slice(0, -1));
    applyRef.current({ rowId: t.rowId, edits: t.edits, source: 'redo' });
  }, []);

  const canUndo = useCallback(() => undoStack.length > 0, [undoStack]);
  const canRedo = useCallback(() => redoStack.length > 0, [redoStack]);

  return { record, undo, redo, canUndo, canRedo };
}
