import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useRowVirtualizer } from './use-row-virtualizer';
import type { Density } from '../model/types';

// Mock @tanstack/react-virtual to track internal virtualizer calls
const mockMeasure = vi.fn();
const mockScrollToIndex = vi.fn();
const mockGetVirtualItems = vi.fn(() => [
  { index: 5, start: 160, size: 32, end: 192, key: 5, lane: 0 },
]);
const mockGetTotalSize = vi.fn(() => 3200);

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: mockGetVirtualItems,
    getTotalSize: mockGetTotalSize,
    measure: mockMeasure,
    scrollToIndex: mockScrollToIndex,
  }),
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

  it('does NOT trigger remeasure when re-rendered with the same density', () => {
    const { rerender } = renderHook(
      ({ density }: { density: Density }) => useRowVirtualizer({ scrollRef, count: 100, density }),
      { initialProps: { density: 'compact' as Density } },
    );

    rerender({ density: 'compact' });

    expect(mockMeasure).not.toHaveBeenCalled();
  });
});
