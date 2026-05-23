import type { Command, MoveValidator, TreeState } from '../types';
import { MoveNodeCommand, MoveRejectedError } from './move-node';

export interface OutdentNodeOptions<TRow> {
  /** Id of the node to outdent. */
  id: string;
  /**
   * Optional custom validators (passed through to the underlying move).
   * The built-in cycle/self check always runs.
   */
  validators?: MoveValidator<TRow>[];
}

/**
 * Outdents a node — it moves out from under its current parent and becomes
 * the next sibling of that parent (at the same depth as the parent).
 *
 * Implementation: outdent is a special case of move. We resolve the parent,
 * grandparent, and the parent's index among its siblings, then delegate to
 * `MoveNodeCommand` inserting at `parentIndex + 1`.
 *
 * No-op (returns the same state reference) when the node is already at the
 * top level (has no parent) — there is nowhere to outdent to.
 * Throws `MoveRejectedError` only if a custom validator rejects.
 */
export class OutdentNodeCommand<TRow> implements Command<TRow> {
  readonly type = 'outdent-node';
  readonly description: string;

  private readonly id: string;
  private readonly validators: MoveValidator<TRow>[];
  /** The delegated move, created lazily on first execute. */
  private inner: MoveNodeCommand<TRow> | null = null;
  /** True when execute() actually performed a move (false = no-op). */
  private moved = false;

  constructor(options: OutdentNodeOptions<TRow>) {
    this.id = options.id;
    this.validators = options.validators ?? [];
    this.description = `Outdent ${options.id}`;
  }

  execute(state: TreeState<TRow>): TreeState<TRow> {
    const node = state.nodes.get(this.id);
    if (!node) {
      throw new Error(
        `OutdentNodeCommand: node "${this.id}" not found in tree state.`,
      );
    }

    if (node.parentId == null) {
      // Already at root — nothing to outdent to.
      this.moved = false;
      this.inner = null;
      return state;
    }

    const parent = state.nodes.get(node.parentId)!;
    const grandparentId = parent.parentId;
    const parentSiblings =
      grandparentId == null
        ? state.rootIds
        : state.nodes.get(grandparentId)!.childIds;
    const parentIndex = parentSiblings.indexOf(node.parentId);
    const insertIndex = parentIndex + 1;

    this.inner = new MoveNodeCommand<TRow>({
      id: this.id,
      newParentId: grandparentId,
      index: insertIndex,
      position: 'after',
      validators: this.validators,
    });

    try {
      const next = this.inner.execute(state);
      this.moved = true;
      return next;
    } catch (err) {
      this.moved = false;
      this.inner = null;
      if (err instanceof MoveRejectedError) throw err;
      throw err;
    }
  }

  undo(state: TreeState<TRow>): TreeState<TRow> {
    if (!this.moved || this.inner == null) return state;
    return this.inner.undo(state);
  }
}
