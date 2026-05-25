import { type RefObject, useEffect, useMemo, useRef } from 'react';
import {
  useVirtualizer,
  type Virtualizer,
  type VirtualItem,
} from '@tanstack/react-virtual';
import { ROW_HEIGHT, ROW_OVERSCAN } from '../model/constants';
import type { Density } from '../model/types';

const DENSITY_ROW_HEIGHT: Record<Density, number> = {
  compact: 24,
  standard: 32,
  comfortable: 44,
};

function resolveRowHeight(density: Density | undefined): number {
  return density ? DENSITY_ROW_HEIGHT[density] : ROW_HEIGHT;
}

export interface UseRowVirtualizerOptions {
  /** Ref to the scrollable body element. */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Total number of rows. */
  count: number;
  /** Current density setting. Changes trigger remeasure with scroll anchor preservation. */
  density?: Density;
  /** When true, bypasses windowing and returns all loaded rows as virtual items. */
  printing?: boolean;
}

export interface RowVirtualizerResult {
  /** Returns the virtual items to render. When printing, returns ALL rows. */
  getVirtualItems: () => VirtualItem[];
  /** Returns the total height of all rows. */
  getTotalSize: () => number;
  /** Scrolls to a specific row index. */
  scrollToIndex: Virtualizer<HTMLDivElement, Element>['scrollToIndex'];
  /** Invalidates cached measurements. */
  measure: () => void;
}

/**
 * Wraps TanStack Virtual's `useVirtualizer` with Strata's fixed row height
 * and overscan. Returns a virtualizer interface that drives the body's visible window.
 *
 * When `density` changes, the virtualizer invalidates its measurements and
 * restores the scroll position to the topmost visible row before the change.
 *
 * When `printing` is true, bypasses windowing and returns virtual items for
 * ALL loaded rows so the full dataset is rendered for print output.
 */
export function useRowVirtualizer(
  options: UseRowVirtualizerOptions,
): RowVirtualizerResult {
  const { scrollRef, count, density, printing = false } = options;
  const rowHeight = resolveRowHeight(density);

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: ROW_OVERSCAN,
  });

  // Track previous density to detect changes (skip initial render)
  const prevDensityRef = useRef(density);

  useEffect(() => {
    if (prevDensityRef.current === density) return;
    prevDensityRef.current = density;

    // Capture the topmost visible row index before remeasure
    const virtualItems = virtualizer.getVirtualItems();
    const anchorIndex = virtualItems.length > 0 ? virtualItems[0].index : 0;

    // Invalidate all cached measurements
    virtualizer.measure();

    // Restore scroll position to the anchor row
    virtualizer.scrollToIndex(anchorIndex, { align: 'start' });
  }, [density, virtualizer]);

  // Build print-mode virtual items for all rows
  const printItems = useMemo((): VirtualItem[] => {
    if (!printing) return [];
    return Array.from({ length: count }, (_, index) => ({
      index,
      start: index * rowHeight,
      size: rowHeight,
      end: (index + 1) * rowHeight,
      key: index,
      lane: 0,
    }));
  }, [printing, count, rowHeight]);

  return {
    getVirtualItems: () => {
      if (printing) {
        return printItems;
      }
      return virtualizer.getVirtualItems();
    },
    getTotalSize: () => {
      if (printing) {
        return count * rowHeight;
      }
      return virtualizer.getTotalSize();
    },
    scrollToIndex: (...args) => virtualizer.scrollToIndex(...args),
    measure: () => virtualizer.measure(),
  };
}
