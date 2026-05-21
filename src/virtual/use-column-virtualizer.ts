import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import type { RefObject } from 'react';

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

  return useVirtualizer({
    horizontal: true,
    count: columnWidths.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => columnWidths[index],
    overscan,
  });
}
