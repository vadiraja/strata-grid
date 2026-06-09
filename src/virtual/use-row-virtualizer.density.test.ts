import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useRowVirtualizer } from './use-row-virtualizer';
import type { Density } from '../model/types';

// Mock @tanstack/react-virtual to track internal virtualizer calls
const mockMeasure = vi.fn();
const mockScrollToIndex = vi.fn();
const mockGetVirtualItems = vi.fn(() => [
  { index: 5, start: 180, size: 36, end: 216, key: 5, lane: 0 },
]);
const mockGetTotalSize = vi.fn(() => 3200);
const capturedOptions: { estimateSize?: (index: number) => number } = {};

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (opts: { estimateSize: (index: number) => number }) => {
    capturedOptions.estimateSize = opts.estimateSize;
    return {
      getVirtualItems: mockGetVirtualItems,
      getTotalSize: mockGetTotalSize,
      measure: mockMeasure,
      scrollToIndex: mockScrollToIndex,
    };
  },
}));

describe('useRowVirtualizer — density changes', () => {
  let scrollRef: { current: HTMLDivElement };

  beforeEach(() => {
    scrollRef = { current: document.createElement('div') };
    vi.clearAllMocks();
  });

  it('calls measure() when density changes from standard to compact', () => {
    const { rerender } = renderHook(
      ({ density }: { density: Density }) => useRowVirtualizer({ scrollRef, count: 100, density }),
      { initialProps: { density: 'standard' as Density } },
    );

    rerender({ density: 'compact' });

    expect(mockMeasure).toHaveBeenCalled();
  });

  it('calls scrollToIndex() to preserve scroll anchor when density changes', () => {
    const { rerender } = renderHook(
      ({ density }: { density: Density }) => useRowVirtualizer({ scrollRef, count: 100, density }),
      { initialProps: { density: 'standard' as Density } },
    );

    rerender({ density: 'compact' });

    // scrollToIndex should be called with the anchor index and align: 'start'
    expect(mockScrollToIndex).toHaveBeenCalledWith(
      expect.any(Number),
      { align: 'start' },
    );
  });

  it('preserves scroll anchor within ±1 row tolerance on density change', () => {
    const { rerender } = renderHook(
      ({ density }: { density: Density }) => useRowVirtualizer({ scrollRef, count: 100, density }),
      { initialProps: { density: 'standard' as Density } },
    );

    // The mock returns items starting at index 5
    rerender({ density: 'comfortable' });

    // The anchor passed to scrollToIndex should be the first visible item's index (5)
    expect(mockScrollToIndex).toHaveBeenCalledWith(5, { align: 'start' });
  });

  it('does NOT call measure() on initial render', () => {
    renderHook(
      ({ density }: { density: Density }) => useRowVirtualizer({ scrollRef, count: 100, density }),
      { initialProps: { density: 'standard' as Density } },
    );

    expect(mockMeasure).not.toHaveBeenCalled();
  });

  it('estimateSize matches density: compact=24, standard=36, comfortable=44 (regression for #9)', () => {
    const cases: Array<[Density, number]> = [
      ['compact', 24],
      ['standard', 36],
      ['comfortable', 44],
    ];
    for (const [density, expected] of cases) {
      capturedOptions.estimateSize = undefined;
      renderHook(() =>
        useRowVirtualizer({ scrollRef, count: 10, density }),
      );
      expect(capturedOptions.estimateSize).toBeDefined();
      expect(capturedOptions.estimateSize!(0)).toBe(expected);
    }
  });

  it('rowHeight override takes precedence over density', () => {
    capturedOptions.estimateSize = undefined;
    renderHook(() =>
      useRowVirtualizer({ scrollRef, count: 10, density: 'standard', rowHeight: 60 }),
    );
    expect(capturedOptions.estimateSize).toBeDefined();
    expect(capturedOptions.estimateSize!(0)).toBe(60);
  });

  it('ignores a non-positive rowHeight and falls back to the density height', () => {
    capturedOptions.estimateSize = undefined;
    renderHook(() =>
      useRowVirtualizer({ scrollRef, count: 10, density: 'standard', rowHeight: 0 }),
    );
    expect(capturedOptions.estimateSize).toBeDefined();
    expect(capturedOptions.estimateSize!(0)).toBe(36);
  });

  it('falls back to the density height when the override is cleared', () => {
    const { rerender } = renderHook(
      ({ rowHeight }: { rowHeight: number | undefined }) =>
        useRowVirtualizer({ scrollRef, count: 10, density: 'standard', rowHeight }),
      { initialProps: { rowHeight: 60 as number | undefined } },
    );
    expect(capturedOptions.estimateSize!(0)).toBe(60);

    rerender({ rowHeight: undefined });
    expect(capturedOptions.estimateSize!(0)).toBe(36);
  });

  it('calls measure() when rowHeight override changes', () => {
    const { rerender } = renderHook(
      ({ rowHeight }: { rowHeight: number }) =>
        useRowVirtualizer({ scrollRef, count: 100, density: 'standard', rowHeight }),
      { initialProps: { rowHeight: 36 } },
    );

    rerender({ rowHeight: 50 });

    expect(mockMeasure).toHaveBeenCalled();
  });

  it('does NOT trigger remeasure when re-rendered with the same density', () => {
    const { rerender } = renderHook(
      ({ density }: { density: Density }) => useRowVirtualizer({ scrollRef, count: 100, density }),
      { initialProps: { density: 'compact' as Density } },
    );

    rerender({ density: 'compact' });

    expect(mockMeasure).not.toHaveBeenCalled();
  });
});
