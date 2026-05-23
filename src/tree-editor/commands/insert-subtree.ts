import type { Command, TreeNode, TreeState } from '../types';

export interface InsertSubtreeOptions<TRow> {
  /**
   * Pre-cloned nodes, ordered so that each node appears before its
   * descendants. Their `parentId` and `childIds` refer to ids that will
   * be present in the resulting state (i.e., other ids in this batch
   * for non-root nodes). The root's `parentId` is ignored — it is
   * overwritten with `targetParentId`.
   */
  nodes: TreeNode<TRow>[];
  /** Id of the subtree root within `nodes`. */
  rootId: string;
  /** New parent for the inserted subtree, or `null` to add to root. */
  targetParentId: string | null;
  /** Insertion index inside the target parent (appended when omitted). */
  index?: number;
}

/**
 * Inserts a freshly-cloned subtree under a target parent. Used by the
 * paste flow — the caller (clipboard) produces a clone via `cloneSubtree`
 * and then issues this command so the change is undoable.
 *
 * Undo removes every inserted node from the state.
 */
export class InsertSubtreeCommand<TRow> implements Command<TRow> {
  readonly type = 'insert-subtree';
  readonly description: string;

  private readonly nodes: TreeNode<TRow>[];
  private readonly rootId: string;
  private readonly targetParentId: string | null;
  private resolvedIndex: number;

  constructor(options: InsertSubtreeOptions<TRow>) {
    this.nodes = options.nodes;
    this.rootId = options.rootId;
    this.targetParentId = options.targetParentId;
    this.resolvedIndex = options.index ?? -1;
    this.description =
      options.targetParentId == null
        ? `Insert subtree at root`
        : `Insert subtree under ${options.targetParentId}`;
  }

  execute(state: TreeState<TRow>): TreeState<TRow> {
    if (this.targetParentId != null && !state.nodes.has(this.targetParentId)) {
      throw new Error(
        `InsertSubtreeCommand: parent "${this.targetParentId}" not found.`,
      );
    }
    for (const node of this.nodes) {
      if (state.nodes.has(node.id)) {
        throw new Error(
          `InsertSubtreeCommand: id "${node.id}" already exists in state.`,
        );
      }
    }

    const nodes = new Map(state.nodes);
    // Add all nodes; rewire the subtree root's parentId to the target.
    for (const node of this.nodes) {
      if (node.id === this.rootId) {
        nodes.set(node.id, { ...node, parentId: this.targetParentId });
      } else {
        nodes.set(node.id, node);
      }
    }

    let rootIds = state.rootIds;
    if (this.targetParentId == null) {
      const next = [...rootIds];
      const idx = clampIndex(this.resolvedIndex, next.length);
      this.resolvedIndex = idx;
      next.splice(idx, 0, this.rootId);
      rootIds = next;
    } else {
      const parent = nodes.get(this.targetParentId)!;
      const nextChildIds = [...parent.childIds];
      const idx = clampIndex(this.resolvedIndex, nextChildIds.length);
      this.resolvedIndex = idx;
      nextChildIds.splice(idx, 0, this.rootId);
      nodes.set(this.targetParentId, { ...parent, childIds: nextChildIds });
    }

    return { nodes, rootIds };
  }

  undo(state: TreeState<TRow>): TreeState<TRow> {
    const nodes = new Map(state.nodes);
    for (const node of this.nodes) nodes.delete(node.id);

    let rootIds = state.rootIds;
    if (this.targetParentId == null) {
      rootIds = state.rootIds.filter((id) => id !== this.rootId);
    } else {
      const parent = nodes.get(this.targetParentId);
      if (parent) {
        nodes.set(this.targetParentId, {
          ...parent,
          childIds: parent.childIds.filter((id) => id !== this.rootId),
        });
      }
    }

    return { nodes, rootIds };
  }
}

function clampIndex(index: number, length: number): number {
  if (index < 0 || index > length) return length;
  return index;
}
