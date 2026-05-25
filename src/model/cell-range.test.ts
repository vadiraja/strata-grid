import { describe, expect, it } from 'vitest';
import {
  normalizeRange,
  rangeContainsCell,
  computeRangeStats,
  serializeRangeAsTsv,
  type CellPosition,
  type CellRange,
} from './cell-range';

const cell = (rowIndex: number, columnId: string): CellPosition => ({ rowIndex, columnId });

describe('normalizeRange', () => {
  it('returns null when either endpoint is null', () => {
    expect(normalizeRange(null, cell(0, 'a'), ['a', 'b'])).toBeNull();
    expect(normalizeRange(cell(0, 'a'), null, ['a', 'b'])).toBeNull();
  });

  it('orders top-left to bottom-right regardless of input order', () => {
    const r = normalizeRange(cell(3, 'c'), cell(1, 'a'), ['a', 'b', 'c']);
    expect(r).toEqual({ top: 1, bottom: 3, left: 'a', right: 'c', columnIds: ['a', 'b', 'c'] });
  });

  it('includes all columns between left and right in visual order', () => {
    const r = normalizeRange(cell(0, 'd'), cell(0, 'b'), ['a', 'b', 'c', 'd', 'e']);
    expect(r?.columnIds).toEqual(['b', 'c', 'd']);
  });

  it('returns null when a columnId is not in visibleColumnIds', () => {
    expect(normalizeRange(cell(0, 'z'), cell(1, 'a'), ['a', 'b'])).toBeNull();
    expect(normalizeRange(cell(0, 'a'), cell(1, 'z'), ['a', 'b'])).toBeNull();
  });
});

describe('rangeContainsCell', () => {
  const range: CellRange = { top: 1, bottom: 3, left: 'a', right: 'c', columnIds: ['a', 'b', 'c'] };
  it('returns true for cells inside the range', () => {
    expect(rangeContainsCell(range, cell(2, 'b'))).toBe(true);
    expect(rangeContainsCell(range, cell(1, 'a'))).toBe(true);
    expect(rangeContainsCell(range, cell(3, 'c'))).toBe(true);
  });
  it('returns false for cells outside the range', () => {
    expect(rangeContainsCell(range, cell(0, 'b'))).toBe(false);
    expect(rangeContainsCell(range, cell(2, 'd'))).toBe(false);
  });
});

describe('computeRangeStats', () => {
  it('counts all cells and aggregates numeric values only', () => {
    const stats = computeRangeStats([1, 2, 'x', null, 4]);
    expect(stats.count).toBe(5);
    expect(stats.numericCount).toBe(3);
    expect(stats.sum).toBe(7);
    expect(stats.avg).toBeCloseTo(7 / 3);
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(4);
  });
  it('returns null aggregates when there are no numeric values', () => {
    const stats = computeRangeStats(['a', null, undefined]);
    expect(stats.numericCount).toBe(0);
    expect(stats.sum).toBeNull();
    expect(stats.avg).toBeNull();
    expect(stats.min).toBeNull();
    expect(stats.max).toBeNull();
  });
});

describe('serializeRangeAsTsv', () => {
  it('joins values with tabs per row and newlines between rows', () => {
    const grid = [
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ];
    expect(serializeRangeAsTsv(grid)).toBe('a\tb\tc\n1\t2\t3');
  });
  it('escapes tab and newline characters by quoting the cell', () => {
    expect(serializeRangeAsTsv([['has\ttab', 'plain']])).toBe('"has\ttab"\tplain');
    expect(serializeRangeAsTsv([['has\nnewline']])).toBe('"has\nnewline"');
  });
  it('escapes carriage returns by quoting the cell', () => {
    expect(serializeRangeAsTsv([['has\rcr']])).toBe('"has\rcr"');
  });
});
