import { describe, expect, it } from 'vitest';
import type { ColumnDef } from './types';
import { computeFlexWidths } from './compute-flex-widths';

interface Row {
  id: string;
}

function makeColumn(
  id: string,
  options: Partial<ColumnDef<Row>> = {},
): ColumnDef<Row> {
  return { id, header: id, ...options };
}

describe('computeFlexWidths', () => {
  it('returns empty when no column has flex', () => {
    const result = computeFlexWidths<Row>({
      columns: [makeColumn('a', { width: 100 }), makeColumn('b', { width: 200 })],
      containerWidth: 1000,
      userFixedIds: new Set(),
    });
    expect(result).toEqual({});
  });

  it('gives the leftover to a single flex column', () => {
    const result = computeFlexWidths<Row>({
      columns: [
        makeColumn('a', { width: 100 }),
        makeColumn('b', { width: 200 }),
        makeColumn('grow', { flex: 1 }),
      ],
      containerWidth: 1000,
      userFixedIds: new Set(),
    });
    expect(result).toEqual({ grow: 700 });
  });

  it('splits remainder between flex columns by ratio', () => {
    const result = computeFlexWidths<Row>({
      columns: [
        makeColumn('a', { width: 200 }),
        makeColumn('one', { flex: 1 }),
        makeColumn('two', { flex: 2 }),
      ],
      containerWidth: 800,
      userFixedIds: new Set(),
    });
    expect(result).toEqual({ one: 200, two: 400 });
  });

  it('treats user-fixed flex columns as fixed (their declared width)', () => {
    const result = computeFlexWidths<Row>({
      columns: [
        makeColumn('a', { width: 100 }),
        makeColumn('grow', { width: 220, flex: 1 }),
      ],
      containerWidth: 1000,
      userFixedIds: new Set(['grow']),
    });
    expect(result).toEqual({});
  });

  it('clamps to minWidth when remainder is small', () => {
    const result = computeFlexWidths<Row>({
      columns: [
        makeColumn('a', { width: 900 }),
        makeColumn('grow', { flex: 1, minWidth: 80 }),
      ],
      containerWidth: 1000,
      userFixedIds: new Set(),
    });
    expect(result.grow).toBe(100);

    const overflowed = computeFlexWidths<Row>({
      columns: [
        makeColumn('a', { width: 1500 }),
        makeColumn('grow', { flex: 1, minWidth: 80 }),
      ],
      containerWidth: 1000,
      userFixedIds: new Set(),
    });
    expect(overflowed.grow).toBe(80);
  });

  it('clamps to maxWidth', () => {
    const result = computeFlexWidths<Row>({
      columns: [
        makeColumn('a', { width: 100 }),
        makeColumn('grow', { flex: 1, maxWidth: 300 }),
      ],
      containerWidth: 1000,
      userFixedIds: new Set(),
    });
    expect(result.grow).toBe(300);
  });

  it('returns empty when containerWidth is 0', () => {
    const result = computeFlexWidths<Row>({
      columns: [makeColumn('grow', { flex: 1 })],
      containerWidth: 0,
      userFixedIds: new Set(),
    });
    expect(result).toEqual({});
  });
});
