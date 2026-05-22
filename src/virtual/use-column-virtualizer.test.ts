import { renderHook } from '@testing-library/react';
import { useColumnVirtualizer } from './use-column-virtualizer';

describe('useColumnVirtualizer', () => {
  it('windows columns — renders a partial set for a small viewport', () => {
    const scrollRef = { current: document.createElement('div') };
    Object.defineProperty(scrollRef.current, 'clientWidth', { value: 400 });

    // 20 columns × 160px = 3200px, far wider than the 400px viewport.
    const columnWidths = Array.from({ length: 20 }, () => 160);
    const { result } = renderHook(() =>
      useColumnVirtualizer({ scrollRef, columnWidths }),
    );

    const items = result.current.getVirtualItems();
    // A 400px viewport over 3200px of columns must render a windowed
    // subset, not all 20 — this assertion fails if windowing is disabled.
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThan(20);
    expect(result.current.getTotalSize()).toBe(3200);
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
