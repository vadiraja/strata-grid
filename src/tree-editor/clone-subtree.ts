import type { TreeNode, TreeState } from './types';

export interface CloneSubtreeOptions<TRow> {
  /** Source state to read the subtree from. */
  state: TreeState<TRow>;
  /** Id of the subtree root to clone. */
  rootId: string;
  /** Factory producing the id for each cloned node. */
  generateId: () => string;
  /**
   * Optional callback to transform row data on copy. Defaults to a shallow
   * spread (`{ ...data }`).
   */
  cloneData?: (data: TRow) => TRow;
}

export interface CloneSubtreeResult<TRow> {
  /** Id of the cloned subtree's root (newly minted). */
  newRootId: string;
  /**
   * Flat list of cloned nodes in pre-order (root first), with `parentId`
   * rewritten to point at the new ids. The root's `parentId` is `null` —
   * callers reassign it when inserting somewhere specific.
   */
  nodes: TreeNode<TRow>[];
}

/**
 * Deep-clone the subtree rooted at `rootId`. Every node receives a fresh id
 * from `generateId`, and parent/child relationships are rewired to the new
 * ids. The source `state` is not modified.
 *
 * Throws when `rootId` is not present in `state`.
 */
export function cloneSubtree<TRow>(
  options: CloneSubtreeOptions<TRow>,
): CloneSubtreeResult<TRow> {
  const { state, rootId, generateId, cloneData } = options;
  const root = state.nodes.get(rootId);
  if (!root) {
    throw new Error(`cloneSubtree: root "${rootId}" not in state.`);
  }

  const data = cloneData ?? ((d: TRow) => ({ ...(d as object) }) as TRow);
  const idMap = new Map<string, string>();
  const out: TreeNode<TRow>[] = [];

  // BFS so each parent is processed before its children — we need
  // parents' new ids ready when we visit them.
  const queue: string[] = [rootId];
  idMap.set(rootId, generateId());

  while (queue.length > 0) {
    const oldId = queue.shift()!;
    const node = state.nodes.get(oldId)!;
    const newId = idMap.get(oldId)!;
    const newChildIds: string[] = [];
    for (const childOld of node.childIds) {
      const childNew = generateId();
      idMap.set(childOld, childNew);
      newChildIds.push(childNew);
      queue.push(childOld);
    }
    const newParentId =
      node.parentId != null && idMap.has(node.parentId)
        ? idMap.get(node.parentId)!
        : null;
    out.push({
      id: newId,
      parentId: newParentId,
      childIds: newChildIds,
      data: data(node.data),
    });
  }

  return { newRootId: idMap.get(rootId)!, nodes: out };
}
