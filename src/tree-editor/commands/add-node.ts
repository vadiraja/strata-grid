import type { Command, TreeNode, TreeState } from '../types';

export interface AddNodeOptions<TRow> {
  /** Id for the new node. Must be unique within the tree. */
  id: string;
  /** Parent id, or `null` to add as a root. */
  parentId: string | null;
  /** The row data. */
  data: TRow;
  /**
   * Insertion index within the parent's `childIds` (or `rootIds` when
   * `parentId` is null). When omitted or out of range, the node is appended.
   */
  index?: number;
}

/**
 * Inserts a new node under `parentId` (or as a root when `parentId` is null)
 * at `index` — appended when `index` is omitted.
 *
 * Undo removes the node from its parent's child list and from `nodes`.
 * Because the command captures the resolved insertion index at execute time,
 * undo restores the exact ordering of siblings.
 */
export class AddNodeCommand<TRow> implements Command<TRow> {
  readonly type = 'add-node';
  readonly description: string;

  private readonly id: string;
  private readonly parentId: string | null;
  private readonly data: TRow;
  /** Resolved insertion index, set during execute(). */
  private resolvedIndex = -1;

  constructor(options: AddNodeOptions<TRow>) {
    this.id = options.id;
    this.parentId = options.parentId;
    this.data = options.data;
    if (options.index != null) this.resolvedIndex = options.index;
    this.description =
      options.parentId == null
        ? `Add root node ${options.id}`
        : `Add node ${options.id} under ${options.parentId}`;
  }

  execute(state: TreeState<TRow>): TreeState<TRow> {
    const nodes = new Map(state.nodes);
    let rootIds = state.rootIds;

    const newNode: TreeNode<TRow> = {
      id: this.id,
      parentId: this.parentId,
      childIds: [],
      data: this.data,
    };
    nodes.set(this.id, newNode);

    if (this.parentId == null) {
      const next = [...state.rootIds];
      const idx = clampIndex(this.resolvedIndex, next.length);
      this.resolvedIndex = idx;
      next.splice(idx, 0, this.id);
      rootIds = next;
    } else {
      const parent = state.nodes.get(this.parentId);
      if (!parent) {
        throw new Error(
          `AddNodeCommand: parent "${this.parentId}" not found in tree state.`,
        );
      }
      const nextChildIds = [...parent.childIds];
      const idx = clampIndex(this.resolvedIndex, nextChildIds.length);
      this.resolvedIndex = idx;
      nextChildIds.splice(idx, 0, this.id);
      nodes.set(this.parentId, { ...parent, childIds: nextChildIds });
    }

    return { nodes, rootIds };
  }

  undo(state: TreeState<TRow>): TreeState<TRow> {
    const nodes = new Map(state.nodes);
    nodes.delete(this.id);

    if (this.parentId == null) {
      return {
        nodes,
        rootIds: state.rootIds.filter((id) => id !== this.id),
      };
    }

    const parent = state.nodes.get(this.parentId);
    if (!parent) return { nodes, rootIds: state.rootIds };
    nodes.set(this.parentId, {
      ...parent,
      childIds: parent.childIds.filter((id) => id !== this.id),
    });
    return { nodes, rootIds: state.rootIds };
  }
}

function clampIndex(index: number, length: number): number {
  if (index < 0 || index > length) return length;
  return index;
}
