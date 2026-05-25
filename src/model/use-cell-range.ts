import { useCallback, useMemo, useState } from 'react';
import {
  computeRangeStats,
  normalizeRange,
  rangeContainsCell,
  type CellPosition,
  type CellRange,
  type RangeStats,
} from './cell-range';

export interface UseCellRangeOptions {
  /** Visible column ids in display order (excludes selection + tree). */
  visibleColumnIds: string[];
  /** Read the rendered value at a given cell. If omitted, stats are zeroed. */
  valuesAt?: (rowIndex: number, columnId: string) => unknown;
}

export interface UseCellRangeReturn {
  range: CellRange | null;
  anchor: CellPosition | null;
  focus: CellPosition | null;
  stats: RangeStats;
  isInRange: (rowIndex: number, columnId: string) => boolean;
  beginRange: (cell: CellPosition) => void;
  extendTo: (cell: CellPosition) => void;
  clear: () => void;
}

const emptyStats: RangeStats = {
  count: 0,
  numericCount: 0,
  sum: null,
  avg: null,
  min: null,
  max: null,
};

export function useCellRange({
  visibleColumnIds,
  valuesAt,
}: UseCellRangeOptions): UseCellRangeReturn {
  const [anchor, setAnchor] = useState<CellPosition | null>(null);
  const [focus, setFocus] = useState<CellPosition | null>(null);

  const range = useMemo(
    () => normalizeRange(anchor, focus, visibleColumnIds),
    [anchor, focus, visibleColumnIds],
  );

  const stats = useMemo<RangeStats>(() => {
    if (!range || !valuesAt) return emptyStats;
    const values: unknown[] = [];
    for (let r = range.top; r <= range.bottom; r++) {
      for (const columnId of range.columnIds) {
        values.push(valuesAt(r, columnId));
      }
    }
    return computeRangeStats(values);
  }, [range, valuesAt]);

  const beginRange = useCallback((cell: CellPosition) => {
    setAnchor(cell);
    setFocus(cell);
  }, []);

  const extendTo = useCallback((cell: CellPosition) => {
    setFocus((current) => (current === null ? null : cell));
  }, []);

  const clear = useCallback(() => {
    setAnchor(null);
    setFocus(null);
  }, []);

  const isInRange = useCallback(
    (rowIndex: number, columnId: string) =>
      range ? rangeContainsCell(range, { rowIndex, columnId }) : false,
    [range],
  );

  return { range, anchor, focus, stats, isInRange, beginRange, extendTo, clear };
}
