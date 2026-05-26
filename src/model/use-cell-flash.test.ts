import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCellFlash } from './use-cell-flash';

interface Row { id: string; a: number; b: number }

describe('useCellFlash', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false for every cell initially', () => {
    const rows: Row[] = [{ id: '1', a: 10, b: 20 }];
    const { result } = renderHook(() =>
      useCellFlash({
        rows,
        getRowId: (r) => r.id,
        columnIds: ['a', 'b'],
        getCellValue: (r, c) => (r as unknown as Record<string, unknown>)[c],
        enabled: true,
      }),
    );
    expect(result.current.isFlashing('1', 'a')).toBe(false);
  });

  it('flashes cells whose values changed between renders', () => {
    const rowsA: Row[] = [{ id: '1', a: 10, b: 20 }];
    const rowsB: Row[] = [{ id: '1', a: 10, b: 99 }];
    const { result, rerender } = renderHook(
      ({ rows }: { rows: Row[] }) =>
        useCellFlash({
          rows,
          getRowId: (r) => r.id,
          columnIds: ['a', 'b'],
          getCellValue: (r, c) => (r as unknown as Record<string, unknown>)[c],
          enabled: true,
        }),
      { initialProps: { rows: rowsA } },
    );
    rerender({ rows: rowsB });
    expect(result.current.isFlashing('1', 'b')).toBe(true);
    expect(result.current.isFlashing('1', 'a')).toBe(false);
  });

  it('clears the flash after durationMs elapses', () => {
    const rowsA: Row[] = [{ id: '1', a: 10, b: 20 }];
    const rowsB: Row[] = [{ id: '1', a: 10, b: 99 }];
    const { result, rerender } = renderHook(
      ({ rows }: { rows: Row[] }) =>
        useCellFlash({
          rows,
          getRowId: (r) => r.id,
          columnIds: ['a', 'b'],
          getCellValue: (r, c) => (r as unknown as Record<string, unknown>)[c],
          enabled: true,
          durationMs: 500,
        }),
      { initialProps: { rows: rowsA } },
    );
    rerender({ rows: rowsB });
    expect(result.current.isFlashing('1', 'b')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.isFlashing('1', 'b')).toBe(false);
  });

  it('does nothing when enabled is false', () => {
    const rowsA: Row[] = [{ id: '1', a: 10, b: 20 }];
    const rowsB: Row[] = [{ id: '1', a: 10, b: 99 }];
    const { result, rerender } = renderHook(
      ({ rows }: { rows: Row[] }) =>
        useCellFlash({
          rows,
          getRowId: (r) => r.id,
          columnIds: ['a', 'b'],
          getCellValue: (r, c) => (r as unknown as Record<string, unknown>)[c],
          enabled: false,
        }),
      { initialProps: { rows: rowsA } },
    );
    rerender({ rows: rowsB });
    expect(result.current.isFlashing('1', 'b')).toBe(false);
  });
});
