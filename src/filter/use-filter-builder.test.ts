import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilterBuilder } from './use-filter-builder';

describe('useFilterBuilder — initial state', () => {
  it('starts with an empty AND group', () => {
    const { result } = renderHook(() => useFilterBuilder());
    expect(result.current.expression).toEqual({ logic: 'and', children: [] });
  });
});

describe('useFilterBuilder — addCondition', () => {
  it('adds a leaf condition', () => {
    const { result } = renderHook(() => useFilterBuilder());
    act(() => {
      result.current.addCondition({ columnId: 'name', operator: 'contains', value: 'Alice' });
    });
    expect(result.current.expression.children).toHaveLength(1);
    expect(result.current.expression.children![0]).toEqual({
      columnId: 'name',
      operator: 'contains',
      value: 'Alice',
    });
  });
});

describe('useFilterBuilder — removeCondition', () => {
  it('removes a condition by index', () => {
    const { result } = renderHook(() => useFilterBuilder());
    act(() => {
      result.current.addCondition({ columnId: 'name', operator: 'contains', value: 'A' });
      result.current.addCondition({ columnId: 'age', operator: 'greaterThan', value: 20 });
    });
    act(() => {
      result.current.removeCondition(0);
    });
    expect(result.current.expression.children).toHaveLength(1);
    expect(result.current.expression.children![0].columnId).toBe('age');
  });
});

describe('useFilterBuilder — updateCondition', () => {
  it('updates a condition at index', () => {
    const { result } = renderHook(() => useFilterBuilder());
    act(() => {
      result.current.addCondition({ columnId: 'name', operator: 'contains', value: 'A' });
    });
    act(() => {
      result.current.updateCondition(0, { value: 'Bob' });
    });
    expect(result.current.expression.children![0].value).toBe('Bob');
  });
});

describe('useFilterBuilder — toggleLogic', () => {
  it('toggles between AND and OR', () => {
    const { result } = renderHook(() => useFilterBuilder());
    expect(result.current.expression.logic).toBe('and');
    act(() => {
      result.current.toggleLogic();
    });
    expect(result.current.expression.logic).toBe('or');
    act(() => {
      result.current.toggleLogic();
    });
    expect(result.current.expression.logic).toBe('and');
  });
});

describe('useFilterBuilder — clear', () => {
  it('resets to empty', () => {
    const { result } = renderHook(() => useFilterBuilder());
    act(() => {
      result.current.addCondition({ columnId: 'name', operator: 'contains', value: 'A' });
      result.current.addCondition({ columnId: 'age', operator: 'greaterThan', value: 20 });
    });
    act(() => {
      result.current.clear();
    });
    expect(result.current.expression.children).toHaveLength(0);
  });
});

describe('useFilterBuilder — isValid', () => {
  it('returns false when a condition has no column', () => {
    const { result } = renderHook(() => useFilterBuilder());
    act(() => {
      result.current.addCondition({ operator: 'contains', value: 'A' });
    });
    expect(result.current.isValid).toBe(false);
  });

  it('returns true when all conditions are complete', () => {
    const { result } = renderHook(() => useFilterBuilder());
    act(() => {
      result.current.addCondition({ columnId: 'name', operator: 'contains', value: 'A' });
    });
    expect(result.current.isValid).toBe(true);
  });
});
