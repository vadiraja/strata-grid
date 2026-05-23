import type { Command, TreeNode, TreeState } from '../types';

export interface DeleteNodeOptions {
  /** Id of the node to delete. The whole subtree is removed. */
  id: string;
}

/**
 * Removes a node and its entire subtree. The command captures the deleted
 * subtree and the node's position among its siblings so undo can restore the
 * exact prior state.
 */
export class DeleteNodeCommand<TRow> implements Command<TRow> {
  readonly type = 'delete-node';
  readonly description: string;

  private readonly id: string;
  /** Snapshot of the node + every descendant, captured at execute time. */
  private snapshot: TreeNode<TRow>[] = [];
  /** The deleted node's parent id at execute time. */
  private parentId: string | null = null;
  /** The deleted node's index within its parent's child list. */
  private index = -1;

  constructor(options: DeleteNodeOptions) {
    this.id = options.id;
    this.description = `Delete node ${options.id}`;
  }

  execute(state: TreeState<TRow>): TreeState<TRow> {
    const target = state.nodes.get(this.id);
    if (!target) {
      throw new Error(
        `DeleteNodeCommand: node "${this.id}" not found in tree state.`,
      );
    }

    // Snapshot the subtree (depth-first) so undo can rehydrate it verbatim.
    const snapshot: TreeNode<TRow>[] = [];
    const idsToRemove = new Set<string>();
    const collect = (nodeId: string) => {
      const node = state.nodes.get(nodeId);
      if (!node) return;
      snapshot.push(node);
      idsToRemove.add(nodeId);
      for (const childId of node.childIds) collect(childId);
    };
    collect(this.id);
    this.snapshot = snapshot;
    this.parentId = target.parentId;

    const nodes = new Map(state.nodes);
    for (const id of idsToRemove) nodes.delete(id);

    let rootIds = state.rootIds;
    if (target.parentId == null) {
      this.index = state.rootIds.indexOf(this.id);
      rootIds = state.rootIds.filter((id) => id !== this.id);
    } else {
      const parent = state.nodes.get(target.parentId);
      if (parent) {
        this.index = parent.childIds.indexOf(this.id);
        nodes.set(target.parentId, {
          ...parent,
          childIds: parent.childIds.filter((id) => id !== this.id),
        });
      }
    }

    return { nodes, rootIds };
  }

  undo(state: TreeState<TRow>): TreeState<TRow> {
    if (this.snapshot.length === 0) return state;
    const nodes = new Map(state.nodes);
    for (const node of this.snapshot) nodes.set(node.id, node);

    let rootIds = state.rootIds;
    if (this.parentId == null) {
      const next = [...state.rootIds];
      const idx = this.index >= 0 && this.index <= next.length
        ? this.index
        : next.length;
      next.splice(idx, 0, this.id);
      rootIds = next;
    } else {
      const parent = nodes.get(this.parentId);
      if (parent) {
        const nextChildIds = [...parent.childIds];
        const idx = this.index >= 0 && this.index <= nextChildIds.length
          ? this.index
          : nextChildIds.length;
        nextChildIds.splice(idx, 0, this.id);
        nodes.set(this.parentId, { ...parent, childIds: nextChildIds });
      }
    }

    return { nodes, rootIds };
  }
}
