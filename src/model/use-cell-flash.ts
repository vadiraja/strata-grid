import { useCallback, useEffect, useRef, useState } from 'react';
import {
  composeFlashKey,
  diffRowValues,
  type RowValueSnapshot,
} from './cell-flash';

export interface UseCellFlashOptions<TRow> {
  /** Current row list. */
  rows: TRow[];
  /** Returns the stable id for a row. */
  getRowId: (row: TRow) => string;
  /** Column ids to track. */
  columnIds: string[];
  /** Reads the value of a (row, columnId) pair for diffing. */
  getCellValue: (row: TRow, columnId: string) => unknown;
  /** Whether to track changes. When false, the hook is inert. */
  enabled: boolean;
  /** Flash duration in milliseconds. Defaults to 1500. */
  durationMs?: number;
}

export interface UseCellFlashReturn {
  /** Returns whether the given cell is currently flashing. */
  isFlashing: (rowId: string, columnId: string) => boolean;
}

const DEFAULT_DURATION_MS = 1500;

export function useCellFlash<TRow>({
  rows,
  getRowId,
  columnIds,
  getCellValue,
  enabled,
  durationMs = DEFAULT_DURATION_MS,
}: UseCellFlashOptions<TRow>): UseCellFlashReturn {
  const prevSnapshotRef = useRef<RowValueSnapshot | null>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [activeFlashes, setActiveFlashes] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!enabled) {
      prevSnapshotRef.current = null;
      return;
    }
    const nextSnapshot: RowValueSnapshot = new Map();
    for (const row of rows) {
      const rowId = getRowId(row);
      const inner = new Map<string, unknown>();
      for (const columnId of columnIds) {
        inner.set(columnId, getCellValue(row, columnId));
      }
      nextSnapshot.set(rowId, inner);
    }
    const changes = diffRowValues(prevSnapshotRef.current, nextSnapshot, columnIds);
    prevSnapshotRef.current = nextSnapshot;
    if (changes.length === 0) return;

    const keys = changes.map((c) => composeFlashKey(c.rowId, c.columnId));
    setActiveFlashes((prev) => {
      const next = new Set(prev);
      for (const k of keys) next.add(k);
      return next;
    });

    const timers = timersRef.current;
    for (const k of keys) {
      const existing = timers.get(k);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        timers.delete(k);
        setActiveFlashes((prev) => {
          if (!prev.has(k)) return prev;
          const next = new Set(prev);
          next.delete(k);
          return next;
        });
      }, durationMs);
      timers.set(k, timer);
    }
  }, [rows, getRowId, columnIds, getCellValue, enabled, durationMs]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  const isFlashing = useCallback(
    (rowId: string, columnId: string) =>
      activeFlashes.has(composeFlashKey(rowId, columnId)),
    [activeFlashes],
  );

  return { isFlashing };
}
