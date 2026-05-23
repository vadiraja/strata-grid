import { useCallback, useMemo, useState } from 'react';
import type { ChangeSet, TreeState } from './types';

export interface UseChangeTrackerOptions<TRow> {
  /** Current tree state, typically `history.state`. */
  state: TreeState<TRow>;
}

export interface UseChangeTrackerReturn<TRow> {
  /** Delta between the last save point and `state`. */
  changeSet: ChangeSet<TRow>;
  /** `true` when any structural change is pending. */
  isDirty: boolean;
  /** Treat the current `state` as the new save point. */
  markClean: () => void;
}

/**
 * Track structural deltas since the last save point.
 *
 * The tracker holds a snapshot of `state` from the last `markClean()` call
 * (initially the first render's state) and re-derives the `ChangeSet` by
 * diffing it with the live state. This naturally handles:
 *
 * - undo (state reverts toward the save point → change set shrinks)
 * - add-then-delete of the same id (cancels out)
 * - re-parent of a previously-moved node (always reflects net parent change)
 *
 * Consumers call `markClean()` after a successful save to reset the
 * tracker without altering history.
 */
export function useChangeTracker<TRow>(
  options: UseChangeTrackerOptions<TRow>,
): UseChangeTrackerReturn<TRow> {
  const { state } = options;
  const [savePoint, setSavePoint] = useState<TreeState<TRow>>(state);

  const changeSet = useMemo<ChangeSet<TRow>>(
    () => diff(savePoint, state),
    [savePoint, state],
  );
  const isDirty =
    changeSet.added.length +
      changeSet.deleted.length +
      changeSet.moved.length >
    0;

  const markClean = useCallback(() => {
    setSavePoint(state);
  }, [state]);

  return { changeSet, isDirty, markClean };
}

function diff<TRow>(
  before: TreeState<TRow>,
  after: TreeState<TRow>,
): ChangeSet<TRow> {
  const added: ChangeSet<TRow>['added'] = [];
  const deleted: ChangeSet<TRow>['deleted'] = [];
  const moved: ChangeSet<TRow>['moved'] = [];

  for (const [id, node] of after.nodes) {
    const prev = before.nodes.get(id);
    if (!prev) {
      added.push({ id, parentId: node.parentId, data: node.data });
    } else if (prev.parentId !== node.parentId) {
      moved.push({
        id,
        oldParentId: prev.parentId,
        newParentId: node.parentId,
      });
    }
  }
  for (const [id, node] of before.nodes) {
    if (!after.nodes.has(id)) {
      deleted.push({ id, parentId: node.parentId, data: node.data });
    }
  }

  return { added, deleted, moved };
}
