/** Per-cell snapshot: rowId → columnId → value. */
export type RowValueSnapshot = Map<string, Map<string, unknown>>;

export interface ChangedCell {
  rowId: string;
  columnId: string;
}

const KEY_SEP = ' ';

/** Stable string key for a (rowId, columnId) pair. */
export function composeFlashKey(rowId: string, columnId: string): string {
  return `${rowId}${KEY_SEP}${columnId}`;
}

/**
 * Diff two snapshots. Returns cells whose value changed (per `Object.is`)
 * between `prev` and `next`. Rows only in `prev` (deletions) or only in `next`
 * (additions) emit no changes — flash is for value updates only.
 */
export function diffRowValues(
  prev: RowValueSnapshot | null,
  next: RowValueSnapshot,
  columnIds: string[],
): ChangedCell[] {
  if (prev === null) return [];
  const changes: ChangedCell[] = [];
  for (const [rowId, nextRow] of next) {
    const prevRow = prev.get(rowId);
    if (!prevRow) continue;
    for (const columnId of columnIds) {
      const a = prevRow.get(columnId);
      const b = nextRow.get(columnId);
      if (!Object.is(a, b)) {
        changes.push({ rowId, columnId });
      }
    }
  }
  return changes;
}
