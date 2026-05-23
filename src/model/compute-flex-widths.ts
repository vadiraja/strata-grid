import type { ColumnDef } from './types';
import { DEFAULT_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from './constants';

export interface FlexInput<TRow> {
  /** Visible leaf columns in display order. */
  columns: ColumnDef<TRow>[];
  /** Available horizontal width in pixels (typically the scroll-area width). */
  containerWidth: number;
  /** Column ids the user has explicitly resized — these are treated as fixed. */
  userFixedIds: ReadonlySet<string>;
}

/**
 * Computes pixel widths for `flex` columns. Returns a map keyed by column id,
 * containing only the flex columns (callers merge this into `columnSizing`).
 *
 * Algorithm: subtract all non-flex / user-fixed widths from `containerWidth`,
 * then split the remainder across flex columns by their `flex` ratio, clamped
 * to `[minWidth, maxWidth]`. If the remainder is non-positive (fixed columns
 * already overflow), flex columns collapse to `minWidth`.
 */
export function computeFlexWidths<TRow>({
  columns,
  containerWidth,
  userFixedIds,
}: FlexInput<TRow>): Record<string, number> {
  const flexColumns = columns.filter(
    (column) => column.flex !== undefined && !userFixedIds.has(column.id),
  );
  if (flexColumns.length === 0 || containerWidth <= 0) return {};

  let fixedTotal = 0;
  for (const column of columns) {
    if (column.flex !== undefined && !userFixedIds.has(column.id)) continue;
    fixedTotal += column.width ?? DEFAULT_COLUMN_WIDTH;
  }

  const remainder = Math.max(0, containerWidth - fixedTotal);
  const totalFlex = flexColumns.reduce(
    (sum, column) => sum + (column.flex ?? 0),
    0,
  );
  if (totalFlex <= 0) return {};

  const result: Record<string, number> = {};
  for (const column of flexColumns) {
    const min = column.minWidth ?? MIN_COLUMN_WIDTH;
    const max = column.maxWidth ?? Number.POSITIVE_INFINITY;
    const share = (remainder * (column.flex ?? 0)) / totalFlex;
    result[column.id] = Math.round(Math.min(max, Math.max(min, share)));
  }
  return result;
}
