import { useState, useEffect, useCallback, useRef } from 'react';
import type { DataSource } from './data-source';
import type { DataChangeEvent } from './types';
import { reconcileChanges } from './reconcile-changes';

export interface UseLiveUpdatesOptions<TRow> {
  /** Called when a 'refresh' event is received (full reload needed). */
  onRefreshNeeded?: () => void;
  /** Function to get parent id for cascade delete. */
  getParentId?: (row: TRow) => string | null | undefined;
}

export interface UseLiveUpdatesReturn<TRow> {
  /** Current data with live updates applied. */
  data: TRow[];
  /** Number of queued updates (during editing). */
  pendingCount: number;
  /** Set whether the grid is in editing mode (queues updates). */
  setEditing: (editing: boolean) => void;
}

/**
 * Hook that subscribes to live data changes and reconciles them into the grid state.
 *
 * - Subscribes to `dataSource.subscribe()` on mount.
 * - Reconciles add/update/delete events immediately.
 * - Queues events while the user is editing; applies them when editing ends.
 * - Signals refresh-needed for full reload events.
 */
export function useLiveUpdates<TRow>(
  dataSource: DataSource<TRow>,
  initialData: TRow[],
  getRowId: (row: TRow) => string,
  options: UseLiveUpdatesOptions<TRow> = {},
): UseLiveUpdatesReturn<TRow> {
  const { onRefreshNeeded, getParentId } = options;

  const [data, setData] = useState<TRow[]>(initialData);
  const [pendingCount, setPendingCount] = useState(0);

  const queueRef = useRef<DataChangeEvent<TRow>[]>([]);
  const isEditingRef = useRef(false);

  // Stable refs for callbacks to avoid re-subscribing
  const getRowIdRef = useRef(getRowId);
  getRowIdRef.current = getRowId;
  const getParentIdRef = useRef(getParentId);
  getParentIdRef.current = getParentId;
  const onRefreshNeededRef = useRef(onRefreshNeeded);
  onRefreshNeededRef.current = onRefreshNeeded;

  // Subscribe to live updates
  useEffect(() => {
    if (!dataSource.subscribe) return;

    const unsubscribe = dataSource.subscribe((event: DataChangeEvent<TRow>) => {
      if (isEditingRef.current) {
        // Queue the event
        queueRef.current.push(event);
        setPendingCount((c) => c + 1);
        return;
      }

      if (event.type === 'refresh') {
        onRefreshNeededRef.current?.();
        return;
      }

      // Apply immediately using functional update to avoid stale closure
      setData((current) => {
        const result = reconcileChanges(
          current,
          event,
          getRowIdRef.current,
          getParentIdRef.current,
        );
        return result ?? current;
      });
    });

    return unsubscribe;
  }, [dataSource]);

  // Apply queued events when editing ends
  const setEditing = useCallback(
    (editing: boolean) => {
      isEditingRef.current = editing;

      if (!editing && queueRef.current.length > 0) {
        const queued = queueRef.current;
        queueRef.current = [];

        setData((current) => {
          let result = current;
          for (const event of queued) {
            if (event.type === 'refresh') {
              onRefreshNeededRef.current?.();
              break;
            }
            const reconciled = reconcileChanges(
              result,
              event,
              getRowIdRef.current,
              getParentIdRef.current,
            );
            if (reconciled !== null) {
              result = reconciled;
            }
          }
          return result;
        });
        setPendingCount(0);
      }
    },
    [],
  );

  return { data, pendingCount, setEditing };
}
