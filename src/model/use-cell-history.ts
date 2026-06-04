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

  const record = useCallback((t: CellTransaction) => {
    setUndoStack((prev) => {
      const next = [...prev, t];
      return next.length > depth ? next.slice(next.length - depth) : next;
    });
    setRedoStack([]);
  }, [depth]);

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const t = prev[prev.length - 1];
      applyRef.current({ rowId: t.rowId, edits: t.edits.map((e) => ({ columnId: e.columnId, oldValue: e.newValue, newValue: e.oldValue })), source: 'undo' });
      setRedoStack((r) => [...r, t]);
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const t = prev[prev.length - 1];
      applyRef.current({ rowId: t.rowId, edits: t.edits, source: 'redo' });
      setUndoStack((u) => [...u, t]);
      return prev.slice(0, -1);
    });
  }, []);

  const canUndo = useCallback(() => undoStack.length > 0, [undoStack]);
  const canRedo = useCallback(() => redoStack.length > 0, [redoStack]);

  return { record, undo, redo, canUndo, canRedo };
}
