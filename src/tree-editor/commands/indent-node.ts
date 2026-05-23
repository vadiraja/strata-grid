import type { Command, MoveValidator, TreeState } from '../types';
import { MoveNodeCommand, MoveRejectedError } from './move-node';

export interface IndentNodeOptions<TRow> {
  /** Id of the node to indent. */
  id: string;
  /**
   * Optional custom validators (passed through to the underlying move).
   * The built-in cycle/self check always runs.
   */
  validators?: MoveValidator<TRow>[];
}

/**
 * Indents a node — it becomes the last child of its immediately preceding
 * sibling. Works for both root-level and nested nodes.
 *
 * Implementation: indent is a special case of move. We resolve the previous
 * sibling and delegate to `MoveNodeCommand`.
 *
 * No-op (returns the same state reference) when the node has no previous
 * sibling — i.e., it is the first child of its parent (or the first root).
 * Throws `MoveRejectedError` only if a custom validator rejects.
 */
export class IndentNodeCommand<TRow> implements Command<TRow> {
  readonly type = 'indent-node';
  readonly description: string;

  private readonly id: string;
  private readonly validators: MoveValidator<TRow>[];
  /** The delegated move, created lazily on first execute. */
  private inner: MoveNodeCommand<TRow> | null = null;
  /** True when execute() actually performed a move (false = no-op). */
  private moved = false;

  constructor(options: IndentNodeOptions<TRow>) {
    this.id = options.id;
    this.validators = options.validators ?? [];
    this.description = `Indent ${options.id}`;
  }

  execute(state: TreeState<TRow>): TreeState<TRow> {
    const node = state.nodes.get(this.id);
    if (!node) {
      throw new Error(
        `IndentNodeCommand: node "${this.id}" not found in tree state.`,
      );
    }

    const siblings =
      node.parentId == null
        ? state.rootIds
        : state.nodes.get(node.parentId)!.childIds;
    const index = siblings.indexOf(this.id);
    const prevSiblingId = index > 0 ? siblings[index - 1] : null;

    if (prevSiblingId == null) {
      // No previous sibling — indent is not possible.
      this.moved = false;
      this.inner = null;
      return state;
    }

    this.inner = new MoveNodeCommand<TRow>({
      id: this.id,
      newParentId: prevSiblingId,
      // Append as the last child of the previous sibling.
      position: 'child',
      validators: this.validators,
    });

    try {
      const next = this.inner.execute(state);
      this.moved = true;
      return next;
    } catch (err) {
      this.moved = false;
      this.inner = null;
      // Surface MoveRejectedError so callers can react; other errors propagate.
      if (err instanceof MoveRejectedError) throw err;
      throw err;
    }
  }

  undo(state: TreeState<TRow>): TreeState<TRow> {
    if (!this.moved || this.inner == null) return state;
    return this.inner.undo(state);
  }
}
