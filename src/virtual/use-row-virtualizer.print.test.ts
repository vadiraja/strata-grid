import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useRowVirtualizer } from './use-row-virtualizer';
import { ROW_HEIGHT } from '../model/constants';

// Mock @tanstack/react-virtual similar to the density test file
const mockMeasure = vi.fn();
const mockScrollToIndex = vi.fn();
const mockGetVirtualItems = vi.fn(() => [
  { index: 0, start: 0, size: ROW_HEIGHT, end: ROW_HEIGHT, key: 0, lane: 0 },
  { index: 1, start: ROW_HEIGHT, size: ROW_HEIGHT, end: ROW_HEIGHT * 2, key: 1, lane: 0 },
  { index: 2, start: ROW_HEIGHT * 2, size: ROW_HEIGHT, end: ROW_HEIGHT * 3, key: 2, lane: 0 },
]);
const mockGetTotalSize = vi.fn(() => 500 * ROW_HEIGHT);

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: mockGetVirtualItems,
    getTotalSize: mockGetTotalSize,
    measure: mockMeasure,
    scrollToIndex: mockScrollToIndex,
  }),
}));

describe('useRowVirtualizer — print mode', () => {
  let scrollRef: { current: HTMLDivElement };

  beforeEach(() => {
    scrollRef = { current: document.createElement('div') };
    vi.clearAllMocks();
  });

  it('returns exactly 500 virtual items when printing=true with 500 rows', () => {
    const { result } = renderHook(() =>
      useRowVirtualizer({ scrollRef, count: 500, printing: true }),
    );

    const items = result.current.getVirtualItems();
    expect(items).toHaveLength(500);
  });

  it('each virtual item has correct index, start, and size values', () => {
    const { result } = renderHook(() =>
      useRowVirtualizer({ scrollRef, count: 500, printing: true }),
    );

    const items = result.current.getVirtualItems();

    for (let i = 0; i < items.length; i++) {
      expect(items[i].index).toBe(i);
      expect(items[i].start).toBe(i * ROW_HEIGHT);
      expect(items[i].size).toBe(ROW_HEIGHT);
    }
  });

  it('returns only the windowed subset when printing=false', () => {
    const { result } = renderHook(() =>
      useRowVirtualizer({ scrollRef, count: 500, printing: false }),
    );

    const items = result.current.getVirtualItems();
    // The mock returns only 3 items (windowed subset)
    expect(items.length).toBeLessThan(500);
    expect(items).toHaveLength(3);
  });

  it('getTotalSize() returns correct total when printing (500 * ROW_HEIGHT)', () => {
    const { result } = renderHook(() =>
      useRowVirtualizer({ scrollRef, count: 500, printing: true }),
    );

    expect(result.current.getTotalSize()).toBe(500 * ROW_HEIGHT);
  });
});
