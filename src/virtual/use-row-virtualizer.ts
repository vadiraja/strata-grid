import type { RefObject } from 'react';
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import { ROW_HEIGHT, ROW_OVERSCAN } from '../model/constants';

export interface UseRowVirtualizerOptions {
  /** Ref to the scrollable body element. */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Total number of rows. */
  count: number;
}

/**
 * Wraps TanStack Virtual's `useVirtualizer` with Strata's fixed row height
 * and overscan. Returns the virtualizer that drives the body's visible window.
 */
export function useRowVirtualizer(
  options: UseRowVirtualizerOptions,
): Virtualizer<HTMLDivElement, Element> {
  const { scrollRef, count } = options;
  return useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: ROW_OVERSCAN,
  });
}
