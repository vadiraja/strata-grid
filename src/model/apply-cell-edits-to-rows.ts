import type { CellEditDelta } from './types';

export type CellWriter<TRow> = (row: TRow, value: unknown) => TRow;

export function applyCellEditsToRows<TRow>(
  rows: TRow[],
  rowId: string,
  edits: CellEditDelta[],
  getRowId: (row: TRow) => string,
  getWriter: (columnId: string) => CellWriter<TRow> | undefined,
): TRow[] {
  const index = rows.findIndex((r) => getRowId(r) === rowId);
  if (index < 0) return rows;
  let updated = rows[index];
  for (const e of edits) {
    const writer = getWriter(e.columnId);
    if (writer) updated = writer(updated, e.newValue);
  }
  if (updated === rows[index]) return rows;
  const next = rows.slice();
  next[index] = updated;
  return next;
}
