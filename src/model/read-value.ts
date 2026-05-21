import type { ColumnDef } from './types';

/**
 * Reads a column's value from a row.
 *
 * - If `accessor` is a function, it is called with the row.
 * - If `accessor` is a key, that property is read.
 * - If `accessor` is omitted, the column `id` is used as the key.
 */
export function readValue<TRow>(column: ColumnDef<TRow>, row: TRow): unknown {
  const { accessor, id } = column;
  if (typeof accessor === 'function') {
    return accessor(row);
  }
  if (accessor !== undefined) {
    return row[accessor];
  }
  return (row as Record<string, unknown>)[id];
}
