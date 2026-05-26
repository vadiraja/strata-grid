import { describe, expect, it } from 'vitest';
import { diffRowValues, composeFlashKey, type RowValueSnapshot } from './cell-flash';

describe('composeFlashKey', () => {
  it('joins rowId and columnId with a separator', () => {
    expect(composeFlashKey('r1', 'c1')).toBe('r1 c1');
  });
  it('is unique across reordering of inputs', () => {
    expect(composeFlashKey('r1', 'c1')).not.toBe(composeFlashKey('c1', 'r1'));
  });
});

describe('diffRowValues', () => {
  const cols = ['a', 'b', 'c'];

  it('returns empty when prev is null (initial snapshot)', () => {
    const next: RowValueSnapshot = new Map([
      ['r1', new Map([['a', 1], ['b', 2], ['c', 3]])],
    ]);
    expect(diffRowValues(null, next, cols)).toEqual([]);
  });

  it('returns changed (rowId, columnId) pairs', () => {
    const prev: RowValueSnapshot = new Map([
      ['r1', new Map([['a', 1], ['b', 2], ['c', 3]])],
      ['r2', new Map([['a', 10], ['b', 20], ['c', 30]])],
    ]);
    const next: RowValueSnapshot = new Map([
      ['r1', new Map([['a', 1], ['b', 99], ['c', 3]])],
      ['r2', new Map([['a', 10], ['b', 20], ['c', 31]])],
    ]);
    const result = diffRowValues(prev, next, cols);
    expect(result).toContainEqual({ rowId: 'r1', columnId: 'b' });
    expect(result).toContainEqual({ rowId: 'r2', columnId: 'c' });
    expect(result).toHaveLength(2);
  });

  it('ignores rows missing from next (deletions do not flash)', () => {
    const prev: RowValueSnapshot = new Map([
      ['r1', new Map([['a', 1]])],
    ]);
    const next: RowValueSnapshot = new Map();
    expect(diffRowValues(prev, next, cols)).toEqual([]);
  });

  it('treats rows newly present in next as not-flashing (additions do not flash)', () => {
    const prev: RowValueSnapshot = new Map();
    const next: RowValueSnapshot = new Map([
      ['r1', new Map([['a', 1]])],
    ]);
    expect(diffRowValues(prev, next, cols)).toEqual([]);
  });

  it('uses Object.is for equality (NaN does not flash; +0/-0 do flash)', () => {
    const prev: RowValueSnapshot = new Map([
      ['r1', new Map([['a', NaN], ['b', 0]])],
    ]);
    const next: RowValueSnapshot = new Map([
      ['r1', new Map([['a', NaN], ['b', -0]])],
    ]);
    expect(diffRowValues(prev, next, ['a', 'b'])).toEqual([
      { rowId: 'r1', columnId: 'b' },
    ]);
  });
});
