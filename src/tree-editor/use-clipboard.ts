import { useCallback, useRef, useState } from 'react';
import type { Command, TreeNode, TreeState } from './types';
import { cloneSubtree } from './clone-subtree';
import { DeleteNodeCommand } from './commands/delete-node';
import { InsertSubtreeCommand } from './commands/insert-subtree';
import { BatchCommand } from './commands/batch';

/**
 * Snapshot of a single subtree on the clipboard. We store the original
 * node ids so subsequent paste calls can re-clone from the snapshot
 * without needing a live state reference.
 */
export interface ClipboardEntry<TRow> {
  /** Snapshot nodes in pre-order — `nodes[0]` is the subtree root. */
  nodes: TreeNode<TRow>[];
  /** Id of the subtree root within `nodes`. */
  rootId: string;
}

export interface UseClipboardOptions<TRow> {
  /** Current tree state (live reference). */
  state: TreeState<TRow>;
  /** Command executor (typically from `useHistoryManager`). */
  execute: (command: Command<TRow>) => void;
  /** Generate a new id for cloned nodes. */
  generateId: () => string;
  /** Optional row-data transformer. Defaults to a shallow spread. */
  cloneData?: (data: TRow) => TRow;
}

export interface UseClipboardReturn<TRow> {
  /** `true` when the clipboard has something to paste. */
  hasContent: boolean;
  /** Current operation mode — `'cut'` keeps the source until paste, but
   *  the cut is executed eagerly (the spec treats cut as copy + delete). */
  mode: 'copy' | 'cut' | null;
  /** Place the subtree rooted at `id` on the clipboard. */
  copy: (id: string) => void;
  /** Like copy, then issue a `DeleteNodeCommand` (undoable). */
  cut: (id: string) => void;
  /** Insert the clipboard contents under `targetParentId` at `index`. */
  paste: (targetParentId: string | null, index?: number) => boolean;
  /** Clear the clipboard. */
  clear: () => void;
}

/**
 * Internal clipboard for cut/copy/paste of subtrees. Avoids the system
 * clipboard so the structural data isn't serialized to text.
 *
 * Multiple pastes from the same copy each receive freshly-minted ids,
 * so re-pasting never collides with the previous insert.
 */
export function useClipboard<TRow>(
  options: UseClipboardOptions<TRow>,
): UseClipboardReturn<TRow> {
  const { execute, generateId, cloneData } = options;
  const [entry, setEntry] = useState<ClipboardEntry<TRow> | null>(null);
  const [mode, setMode] = useState<'copy' | 'cut' | null>(null);

  // `state` changes frequently; capture it via a ref so callbacks stay stable.
  const stateRef = useRef(options.state);
  stateRef.current = options.state;

  const snapshot = useCallback(
    (id: string): ClipboardEntry<TRow> | null => {
      const state = stateRef.current;
      if (!state.nodes.has(id)) return null;
      // Snapshot keeps the original ids so we can re-clone on every paste.
      const nodes: TreeNode<TRow>[] = [];
      const queue = [id];
      while (queue.length > 0) {
        const next = queue.shift()!;
        const node = state.nodes.get(next)!;
        nodes.push({
          id: node.id,
          parentId: node.parentId,
          childIds: [...node.childIds],
          data: cloneData ? cloneData(node.data) : ({ ...(node.data as object) } as TRow),
        });
        queue.push(...node.childIds);
      }
      return { nodes, rootId: id };
    },
    [cloneData],
  );

  const copy = useCallback(
    (id: string) => {
      const snap = snapshot(id);
      if (!snap) return;
      setEntry(snap);
      setMode('copy');
    },
    [snapshot],
  );

  const cut = useCallback(
    (id: string) => {
      const snap = snapshot(id);
      if (!snap) return;
      setEntry(snap);
      setMode('cut');
      execute(new DeleteNodeCommand<TRow>({ id }));
    },
    [snapshot, execute],
  );

  const paste = useCallback(
    (targetParentId: string | null, index?: number): boolean => {
      if (!entry) return false;
      const state = stateRef.current;
      if (targetParentId != null && !state.nodes.has(targetParentId)) {
        return false;
      }
      // Re-clone from the snapshot so multiple pastes get unique ids.
      const snapshotState: TreeState<TRow> = {
        nodes: new Map(entry.nodes.map((n) => [n.id, n])),
        rootIds: [entry.rootId],
      };
      const clone = cloneSubtree<TRow>({
        state: snapshotState,
        rootId: entry.rootId,
        generateId,
        cloneData,
      });
      execute(
        new InsertSubtreeCommand<TRow>({
          nodes: clone.nodes,
          rootId: clone.newRootId,
          targetParentId,
          index,
        }),
      );
      return true;
    },
    [entry, generateId, cloneData, execute],
  );

  const clear = useCallback(() => {
    setEntry(null);
    setMode(null);
  }, []);

  return {
    hasContent: entry !== null,
    mode,
    copy,
    cut,
    paste,
    clear,
  };
}

// Re-export for callers that want to bundle their own batch (e.g., multi-paste).
export { BatchCommand };
