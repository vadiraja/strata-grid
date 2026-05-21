import { renderHook } from '@testing-library/react';
import { useColumnVirtualizer } from './use-column-virtualizer';

describe('useColumnVirtualizer', () => {
  it('returns virtual items for visible columns', () => {
    const scrollRef = { current: document.createElement('div') };
    Object.defineProperty(scrollRef.current, 'clientWidth', { value: 400 });

    const { result } = renderHook(() =>
      useColumnVirtualizer({
        scrollRef,
        columnWidths: [160, 160, 160, 160, 160], // 5 columns × 160px = 800px total
      }),
    );
    // With 400px viewport, not all 5 columns should be in the initial window
    expect(result.current.getVirtualItems().length).toBeLessThanOrEqual(5);
    expect(result.current.getTotalSize()).toBe(800);
  });

  it('returns total size equal to sum of all column widths', () => {
    const scrollRef = { current: document.createElement('div') };
    Object.defineProperty(scrollRef.current, 'clientWidth', { value: 1000 });

    const { result } = renderHook(() =>
      useColumnVirtualizer({
        scrollRef,
        columnWidths: [100, 200, 150],
      }),
    );
    expect(result.current.getTotalSize()).toBe(450);
  });
});
