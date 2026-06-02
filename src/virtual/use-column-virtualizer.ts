import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import { useRef, type RefObject } from 'react';

export interface UseColumnVirtualizerOptions {
  /** Ref to the horizontal scroll container. */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Widths of the center (unpinned) columns, in order. */
  columnWidths: number[];
  /** Number of extra columns rendered to the left and right. Defaults to 2. */
  overscan?: number;
}

export function useColumnVirtualizer(
  options: UseColumnVirtualizerOptions,
): Virtualizer<HTMLDivElement, Element> {
  const { scrollRef, columnWidths, overscan = 2 } = options;

  const virtualizer = useVirtualizer({
    horizontal: true,
    count: columnWidths.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => columnWidths[index],
    overscan,
  });

  // Column widths change at runtime (flex distribution, user resize). The
  // virtualizer caches item measurements from `estimateSize` and only
  // recomputes them when its size-cache version bumps — not on a size change
  // alone — so its offsets, total size, and the trailing spacer derived from
  // them go stale, leaving a phantom horizontal scrollbar. Re-measure the
  // moment the widths change so the body track matches the rendered columns.
  const widthsKey = columnWidths.join(',');
  const lastWidthsKey = useRef(widthsKey);
  if (lastWidthsKey.current !== widthsKey) {
    lastWidthsKey.current = widthsKey;
    virtualizer.measure();
  }

  return virtualizer;
}
