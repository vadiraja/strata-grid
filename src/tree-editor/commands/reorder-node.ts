import type { Command, TreeState } from '../types';

export interface ReorderNodeOptions {
  /** Id of the node to reorder. */
  id: string;
  /** Direction relative to current sibling position. */
  direction: 'up' | 'down';
}

/**
 * Swaps a node with its previous (`up`) or next (`down`) sibling within the
 * same parent. A no-op when the node is already at the edge of its sibling
 * list — `execute()` returns the same state reference and `undo()` does
 * nothing.
 */
export class ReorderNodeCommand<TRow> implements Command<TRow> {
  readonly type = 'reorder-node';
  readonly description: string;

  private readonly id: string;
  private readonly direction: 'up' | 'down';
  /** Whether execute() actually moved the node (false = no-op). */
  private moved = false;
  /** Parent id at execute time (null for root-level reorder). */
  private parentId: string | null = null;
  /** Original index of the node, captured at execute time. */
  private originalIndex = -1;

  constructor(options: ReorderNodeOptions) {
    this.id = options.id;
    this.direction = options.direction;
    this.description = `Move ${options.id} ${options.direction}`;
  }

  execute(state: TreeState<TRow>): TreeState<TRow> {
    const node = state.nodes.get(this.id);
    if (!node) {
      throw new Error(
        `ReorderNodeCommand: node "${this.id}" not found in tree state.`,
      );
    }

    this.parentId = node.parentId;
    const siblings =
      node.parentId == null
        ? state.rootIds
        : state.nodes.get(node.parentId)!.childIds;
    const index = siblings.indexOf(this.id);
    this.originalIndex = index;

    const swapWith = this.direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= siblings.length) {
      // Edge — no-op.
      this.moved = false;
      return state;
    }

    const nextSiblings = [...siblings];
    [nextSiblings[index], nextSiblings[swapWith]] = [
      nextSiblings[swapWith],
      nextSiblings[index],
    ];
    this.moved = true;

    if (node.parentId == null) {
      return { nodes: state.nodes, rootIds: nextSiblings };
    }
    const nodes = new Map(state.nodes);
    const parent = state.nodes.get(node.parentId)!;
    nodes.set(node.parentId, { ...parent, childIds: nextSiblings });
    return { nodes, rootIds: state.rootIds };
  }

  undo(state: TreeState<TRow>): TreeState<TRow> {
    if (!this.moved) return state;

    const swapWith =
      this.direction === 'up' ? this.originalIndex - 1 : this.originalIndex + 1;

    if (this.parentId == null) {
      const nextRoots = [...state.rootIds];
      [nextRoots[this.originalIndex], nextRoots[swapWith]] = [
        nextRoots[swapWith],
        nextRoots[this.originalIndex],
      ];
      return { nodes: state.nodes, rootIds: nextRoots };
    }

    const parent = state.nodes.get(this.parentId);
    if (!parent) return state;
    const nextChildIds = [...parent.childIds];
    [nextChildIds[this.originalIndex], nextChildIds[swapWith]] = [
      nextChildIds[swapWith],
      nextChildIds[this.originalIndex],
    ];
    const nodes = new Map(state.nodes);
    nodes.set(this.parentId, { ...parent, childIds: nextChildIds });
    return { nodes, rootIds: state.rootIds };
  }
}
