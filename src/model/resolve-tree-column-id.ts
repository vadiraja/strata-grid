import type { ColumnDef } from './types';
import { devWarn } from './dev-warn';

/**
 * Picks which column renders the tree hierarchy.
 *
 * Returns the id of the column flagged `isTreeColumn`. If no column is
 * flagged, falls back to the first column and emits a development warning.
 * Returns an empty string if there are no columns at all.
 */
export function resolveTreeColumnId<TRow>(columns: ColumnDef<TRow>[]): string {
  const designated = columns.find((column) => column.isTreeColumn);
  if (designated) {
    return designated.id;
  }
  if (columns.length === 0) {
    devWarn('Tree mode is on but the grid has no columns.');
    return '';
  }
  devWarn(
    'No column has isTreeColumn: true; using the first column for the tree.',
  );
  return columns[0].id;
}
