import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCellRange } from './use-cell-range';

const columnIds = ['a', 'b', 'c', 'd'];

describe('useCellRange', () => {
  it('starts with no range', () => {
    const { result } = renderHook(() => useCellRange({ visibleColumnIds: columnIds }));
    expect(result.current.range).toBeNull();
    expect(result.current.isInRange(0, 'a')).toBe(false);
  });

  it('beginRange + extendTo produces a normalized range', () => {
    const { result } = renderHook(() => useCellRange({ visibleColumnIds: columnIds }));
    act(() => result.current.beginRange({ rowIndex: 2, columnId: 'b' }));
    act(() => result.current.extendTo({ rowIndex: 4, columnId: 'd' }));
    expect(result.current.range).toMatchObject({ top: 2, bottom: 4, left: 'b', right: 'd' });
    expect(result.current.isInRange(3, 'c')).toBe(true);
    expect(result.current.isInRange(1, 'b')).toBe(false);
  });

  it('extendTo without beginRange is a no-op', () => {
    const { result } = renderHook(() => useCellRange({ visibleColumnIds: columnIds }));
    act(() => result.current.extendTo({ rowIndex: 4, columnId: 'd' }));
    expect(result.current.range).toBeNull();
  });

  it('clear resets anchor and focus', () => {
    const { result } = renderHook(() => useCellRange({ visibleColumnIds: columnIds }));
    act(() => result.current.beginRange({ rowIndex: 0, columnId: 'a' }));
    act(() => result.current.extendTo({ rowIndex: 1, columnId: 'b' }));
    act(() => result.current.clear());
    expect(result.current.range).toBeNull();
  });

  it('exposes computed stats over the supplied valuesAt', () => {
    const valuesAt = (rowIndex: number, columnId: string): unknown => {
      if (columnId === 'a') return rowIndex * 10;
      if (columnId === 'b') return 'x';
      return null;
    };
    const { result } = renderHook(() =>
      useCellRange({ visibleColumnIds: columnIds, valuesAt }),
    );
    act(() => result.current.beginRange({ rowIndex: 0, columnId: 'a' }));
    act(() => result.current.extendTo({ rowIndex: 2, columnId: 'b' }));
    expect(result.current.stats.count).toBe(6);
    expect(result.current.stats.numericCount).toBe(3);
    expect(result.current.stats.sum).toBe(30);
  });
});
