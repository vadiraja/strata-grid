import { applyCellEditsToRows } from './apply-cell-edits-to-rows';

interface Row { id: string; a: number; b: string; }
const rows: Row[] = [{ id: '1', a: 1, b: 'x' }, { id: '2', a: 2, b: 'y' }];
const getRowId = (r: Row) => r.id;
const writers: Record<string, (r: Row, v: unknown) => Row> = {
  a: (r, v) => ({ ...r, a: v as number }),
  b: (r, v) => ({ ...r, b: v as string }),
};

describe('applyCellEditsToRows', () => {
  it('returns a new array with the target row updated, others identical by reference', () => {
    const next = applyCellEditsToRows(rows, '2', [
      { columnId: 'a', oldValue: 2, newValue: 9 },
      { columnId: 'b', oldValue: 'y', newValue: 'z' },
    ], getRowId, (colId) => writers[colId]);
    expect(next).not.toBe(rows);
    expect(next[0]).toBe(rows[0]);
    expect(next[1]).toEqual({ id: '2', a: 9, b: 'z' });
  });

  it('returns the same array when the row id is not found', () => {
    const next = applyCellEditsToRows(rows, 'nope', [{ columnId: 'a', oldValue: 0, newValue: 1 }], getRowId, () => undefined);
    expect(next).toBe(rows);
  });

  it('returns the same array when no writer applies any change', () => {
    const next = applyCellEditsToRows(rows, '1', [{ columnId: 'zzz', oldValue: 0, newValue: 1 }], getRowId, () => undefined);
    expect(next).toBe(rows);
  });
});
