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

  it('in', () => {
    const expr: FilterExpression = { columnId: 'city', operator: 'in', value: ['New York', 'LA'] };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('isEmpty', () => {
    const emptyRow = { ...row, city: '' };
    const expr: FilterExpression = { columnId: 'city', operator: 'isEmpty' };
    expect(evaluateFilter(emptyRow, expr, getValue)).toBe(true);
    expect(evaluateFilter(row, expr, getValue)).toBe(false);
  });

  it('between', () => {
    const expr: FilterExpression = { columnId: 'age', operator: 'between', value: [25, 35] };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
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
