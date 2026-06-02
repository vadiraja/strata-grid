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

  it('updates total size when column widths change after mount', () => {
    // Reproduces the flex-resize bug: a flex column grows (e.g. 165 -> 805 when
    // the window widens). The virtualizer caches measurements from estimateSize
    // and, without re-measuring, keeps stale offsets — leaving an oversized
    // trailing spacer and a phantom horizontal scrollbar.
    const scrollRef = { current: document.createElement('div') };
    Object.defineProperty(scrollRef.current, 'clientWidth', { value: 2000 });

    const { result, rerender } = renderHook(
      ({ widths }) => useColumnVirtualizer({ scrollRef, columnWidths: widths }),
      { initialProps: { widths: [165, 160, 80, 160, 140, 92] } },
    );
    expect(result.current.getTotalSize()).toBe(797);

    // Supplier flexes 165 -> 805; the new total must follow (805+160+80+160+140+92).
    rerender({ widths: [805, 160, 80, 160, 140, 92] });
    expect(result.current.getTotalSize()).toBe(1437);
  });
});
