export interface CellPosition {
  rowIndex: number;
  columnId: string;
}

export interface CellRange {
  top: number;
  bottom: number;
  left: string;
  right: string;
  /** Column ids between left and right in visual order, inclusive. */
  columnIds: string[];
}

export interface RangeStats {
  count: number;
  numericCount: number;
  sum: number | null;
  avg: number | null;
  min: number | null;
  max: number | null;
}

export function normalizeRange(
  anchor: CellPosition | null,
  focus: CellPosition | null,
  visibleColumnIds: string[],
): CellRange | null {
  if (!anchor || !focus) return null;
  const aIdx = visibleColumnIds.indexOf(anchor.columnId);
  const fIdx = visibleColumnIds.indexOf(focus.columnId);
  if (aIdx === -1 || fIdx === -1) return null;
  const left = aIdx <= fIdx ? anchor.columnId : focus.columnId;
  const right = aIdx <= fIdx ? focus.columnId : anchor.columnId;
  const top = Math.min(anchor.rowIndex, focus.rowIndex);
  const bottom = Math.max(anchor.rowIndex, focus.rowIndex);
  const start = Math.min(aIdx, fIdx);
  const end = Math.max(aIdx, fIdx);
  return { top, bottom, left, right, columnIds: visibleColumnIds.slice(start, end + 1) };
}

export function rangeContainsCell(range: CellRange, cell: CellPosition): boolean {
  if (cell.rowIndex < range.top || cell.rowIndex > range.bottom) return false;
  return range.columnIds.includes(cell.columnId);
}

export function computeRangeStats(values: unknown[]): RangeStats {
  let numericCount = 0;
  let sum = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const v of values) {
    const n = typeof v === 'number' && Number.isFinite(v) ? v : null;
    if (n === null) continue;
    numericCount++;
    sum += n;
    if (n < min) min = n;
    if (n > max) max = n;
  }
  if (numericCount === 0) {
    return { count: values.length, numericCount: 0, sum: null, avg: null, min: null, max: null };
  }
  return {
    count: values.length,
    numericCount,
    sum,
    avg: sum / numericCount,
    min,
    max,
  };
}

export function serializeRangeAsTsv(grid: string[][]): string {
  return grid
    .map((row) =>
      row
        .map((cell) =>
          /[\t\n"]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell,
        )
        .join('\t'),
    )
    .join('\n');
}
