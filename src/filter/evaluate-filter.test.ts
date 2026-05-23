import { describe, it, expect } from 'vitest';
import { evaluateFilter } from './evaluate-filter';
import type { FilterExpression } from '../data/types';

interface Row { id: string; name: string; age: number; city: string }

const row: Row = { id: '1', name: 'Alice Smith', age: 30, city: 'New York' };
const getValue = (r: Row, colId: string) => (r as unknown as Record<string, unknown>)[colId];

describe('evaluateFilter — leaf conditions', () => {
  it('equals', () => {
    const expr: FilterExpression = { columnId: 'name', operator: 'equals', value: 'Alice Smith' };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('notEquals', () => {
    const expr: FilterExpression = { columnId: 'name', operator: 'notEquals', value: 'Bob' };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('contains (case-insensitive)', () => {
    const expr: FilterExpression = { columnId: 'name', operator: 'contains', value: 'alice' };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('startsWith', () => {
    const expr: FilterExpression = { columnId: 'name', operator: 'startsWith', value: 'Alice' };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('endsWith', () => {
    const expr: FilterExpression = { columnId: 'name', operator: 'endsWith', value: 'Smith' };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('greaterThan', () => {
    const expr: FilterExpression = { columnId: 'age', operator: 'greaterThan', value: 25 };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('lessThan', () => {
    const expr: FilterExpression = { columnId: 'age', operator: 'lessThan', value: 35 };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('in — value in list passes', () => {
    const expr: FilterExpression = { columnId: 'city', operator: 'in', value: ['New York', 'LA'] };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('in — value not in list fails', () => {
    const expr: FilterExpression = { columnId: 'city', operator: 'in', value: ['Tokyo', 'Paris'] };
    expect(evaluateFilter(row, expr, getValue)).toBe(false);
  });

  it('in — empty array fails', () => {
    const expr: FilterExpression = { columnId: 'city', operator: 'in', value: [] };
    expect(evaluateFilter(row, expr, getValue)).toBe(false);
  });

  it('in — non-array filterValue fails', () => {
    const expr: FilterExpression = { columnId: 'city', operator: 'in', value: 'New York' };
    expect(evaluateFilter(row, expr, getValue)).toBe(false);
  });

  it('notIn — value not in list passes', () => {
    const expr: FilterExpression = { columnId: 'city', operator: 'notIn', value: ['Tokyo', 'Paris'] };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('notIn — value in list fails', () => {
    const expr: FilterExpression = { columnId: 'city', operator: 'notIn', value: ['New York', 'LA'] };
    expect(evaluateFilter(row, expr, getValue)).toBe(false);
  });

  it('notIn — non-array filterValue fails (returns false rather than always-pass)', () => {
    const expr: FilterExpression = { columnId: 'city', operator: 'notIn', value: 'New York' };
    expect(evaluateFilter(row, expr, getValue)).toBe(false);
  });

  it('isEmpty', () => {
    const emptyRow = { ...row, city: '' };
    const expr: FilterExpression = { columnId: 'city', operator: 'isEmpty' };
    expect(evaluateFilter(emptyRow, expr, getValue)).toBe(true);
    expect(evaluateFilter(row, expr, getValue)).toBe(false);
  });

  it('isNotEmpty', () => {
    const emptyRow = { ...row, city: '' };
    const expr: FilterExpression = { columnId: 'city', operator: 'isNotEmpty' };
    expect(evaluateFilter(emptyRow, expr, getValue)).toBe(false);
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('between — numeric in range', () => {
    const expr: FilterExpression = { columnId: 'age', operator: 'between', value: [25, 35] };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('between — numeric out of range (below)', () => {
    const expr: FilterExpression = { columnId: 'age', operator: 'between', value: [40, 50] };
    expect(evaluateFilter(row, expr, getValue)).toBe(false);
  });

  it('between — numeric out of range (above)', () => {
    const expr: FilterExpression = { columnId: 'age', operator: 'between', value: [10, 20] };
    expect(evaluateFilter(row, expr, getValue)).toBe(false);
  });

  it('between — numeric inclusive at boundaries', () => {
    const exprLo: FilterExpression = { columnId: 'age', operator: 'between', value: [30, 50] };
    const exprHi: FilterExpression = { columnId: 'age', operator: 'between', value: [10, 30] };
    expect(evaluateFilter(row, exprLo, getValue)).toBe(true);
    expect(evaluateFilter(row, exprHi, getValue)).toBe(true);
  });

  it('between — single-element array fails', () => {
    const expr: FilterExpression = { columnId: 'age', operator: 'between', value: [25] };
    expect(evaluateFilter(row, expr, getValue)).toBe(false);
  });

  it('between — non-array filterValue fails', () => {
    const expr: FilterExpression = { columnId: 'age', operator: 'between', value: 25 };
    expect(evaluateFilter(row, expr, getValue)).toBe(false);
  });

  it('between — ISO date strings (lexicographic fallback)', () => {
    interface DateRow { id: string; createdAt: string }
    const dateRow: DateRow = { id: '1', createdAt: '2026-02-15' };
    const dateGetValue = (r: DateRow, colId: string) =>
      (r as unknown as Record<string, unknown>)[colId];

    const inRange: FilterExpression = {
      columnId: 'createdAt',
      operator: 'between',
      value: ['2026-01-01', '2026-03-31'],
    };
    expect(evaluateFilter(dateRow, inRange, dateGetValue)).toBe(true);

    const outOfRange: FilterExpression = {
      columnId: 'createdAt',
      operator: 'between',
      value: ['2025-01-01', '2025-12-31'],
    };
    expect(evaluateFilter(dateRow, outOfRange, dateGetValue)).toBe(false);
  });
});

describe('evaluateFilter — compound expressions', () => {
  it('AND: all conditions must match', () => {
    const expr: FilterExpression = {
      logic: 'and',
      children: [
        { columnId: 'name', operator: 'contains', value: 'Alice' },
        { columnId: 'age', operator: 'greaterThan', value: 25 },
      ],
    };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('AND: fails if one condition fails', () => {
    const expr: FilterExpression = {
      logic: 'and',
      children: [
        { columnId: 'name', operator: 'contains', value: 'Alice' },
        { columnId: 'age', operator: 'greaterThan', value: 50 },
      ],
    };
    expect(evaluateFilter(row, expr, getValue)).toBe(false);
  });

  it('OR: passes if any condition matches', () => {
    const expr: FilterExpression = {
      logic: 'or',
      children: [
        { columnId: 'name', operator: 'equals', value: 'Bob' },
        { columnId: 'age', operator: 'equals', value: 30 },
      ],
    };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('nested compound expressions', () => {
    const expr: FilterExpression = {
      logic: 'and',
      children: [
        { columnId: 'city', operator: 'equals', value: 'New York' },
        {
          logic: 'or',
          children: [
            { columnId: 'age', operator: 'lessThan', value: 20 },
            { columnId: 'name', operator: 'startsWith', value: 'Ali' },
          ],
        },
      ],
    };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });
});
