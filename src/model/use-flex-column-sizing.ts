import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Table } from '@tanstack/react-table';
import type { ColumnDef, ColumnSizingState } from './types';
import { computeFlexWidths } from './compute-flex-widths';

export interface UseFlexColumnSizingOptions<TRow> {
  table: Table<TRow>;
  columns: ColumnDef<TRow>[];
  /** Ref to the element whose width drives flex distribution. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Current TanStack column sizing state. */
  columnSizing: ColumnSizingState;
}

/**
 * Drives `flex` column distribution: observes the container width, computes
 * flex widths, and pushes them into TanStack `columnSizing`. User-dragged
 * columns become "fixed" and are no longer redistributed.
 *
 * Detection of user vs. library-set sizing: we remember the last set of widths
 * we wrote. If a column's current sizing differs from what we wrote, the user
 * dragged it — its id is added to the fixed set and skipped on future passes.
 */
export function useFlexColumnSizing<TRow>({
  table,
  columns,
  containerRef,
  columnSizing,
}: UseFlexColumnSizingOptions<TRow>) {
  const [containerWidth, setContainerWidth] = useState(0);
  const lastSetWidthsRef = useRef<Record<string, number>>({});
  const userFixedIdsRef = useRef<Set<string>>(new Set());

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;

    setContainerWidth(element.clientWidth);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef]);

  // Detect user drags: any flex column whose current size diverges from the
  // last value we wrote is considered user-fixed from now on.
  useEffect(() => {
    for (const column of columns) {
      if (column.flex === undefined) continue;
      if (userFixedIdsRef.current.has(column.id)) continue;
      const last = lastSetWidthsRef.current[column.id];
      const current = columnSizing[column.id];
      if (last !== undefined && current !== undefined && current !== last) {
        userFixedIdsRef.current.add(column.id);
      }
    }
  }, [columnSizing, columns]);

  useEffect(() => {
    if (containerWidth <= 0) return;
    const flexWidths = computeFlexWidths({
      columns,
      containerWidth,
      userFixedIds: userFixedIdsRef.current,
    });
    if (Object.keys(flexWidths).length === 0) return;

    // Only update if at least one value actually changed; avoids infinite loops.
    let changed = false;
    for (const [id, width] of Object.entries(flexWidths)) {
      if (columnSizing[id] !== width) {
        changed = true;
        break;
      }
    }
    if (!changed) return;

    lastSetWidthsRef.current = {
      ...lastSetWidthsRef.current,
      ...flexWidths,
    };
    table.setColumnSizing((prev) => ({ ...prev, ...flexWidths }));
  }, [containerWidth, columns, columnSizing, table]);
}
