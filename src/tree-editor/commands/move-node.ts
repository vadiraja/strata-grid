import type { Command, MoveValidator, TreeState } from '../types';
import { validateCycleAndSelf } from '../validators';

export interface MoveNodeOptions<TRow> {
  /** Id of the node to move. */
  id: string;
  /** New parent id, or `null` to move to root. */
  newParentId: string | null;
  /**
   * Insertion index within the new parent's `childIds` (or `rootIds`
   * when `newParentId` is null). When omitted or out of range, the node
   * is appended.
   */
  index?: number;
  /**
   * Logical drop position relative to the target. Used only to forward to
   * validators. Defaults to `'child'`.
   */
  position?: 'child' | 'before' | 'after';
  /**
   * Optional custom validators that run in addition to the built-in
   * cycle/self-move check. If any validator returns `{ allowed: false }`,
   * the move is rejected at execute time.
   */
  validators?: MoveValidator<TRow>[];
}

/**
 * Thrown when a move is rejected by a validator.
 */
export class MoveRejectedError extends Error {
  constructor(public readonly reason: string) {
    super(`MoveNodeCommand rejected: ${reason}`);
    this.name = 'MoveRejectedError';
  }
}

/**
 * Reparents a node under `newParentId` (or moves it to root when
 * `newParentId` is null) at `index` — appended when `index` is omitted.
 *
 * The entire subtree follows: only `parentId` of the moved node and the
 * `childIds` of the old/new parent change.
 *
 * Validators (built-in cycle/self plus any custom ones) run before
 * mutation; failure throws `MoveRejectedError` and leaves state untouched.
 *
 * Undo restores the original parent and sibling index.
 */
export class MoveNodeCommand<TRow> implements Command<TRow> {
  readonly type = 'move-node';
  readonly description: string;

  private readonly id: string;
  private readonly newParentId: string | null;
  private readonly position: 'child' | 'before' | 'after';
  private readonly validators: MoveValidator<TRow>[];
  /** Resolved insertion index in the new parent, captured at execute time. */
  private resolvedIndex: number;
  /** Original parent id, captured at execute time for undo. */
  private originalParentId: string | null = null;
  /** Original index among siblings, captured at execute time for undo. */
  private originalIndex = -1;

  constructor(options: MoveNodeOptions<TRow>) {
    this.id = options.id;
    this.newParentId = options.newParentId;
    this.position = options.position ?? 'child';
    this.validators = options.validators ?? [];
    this.resolvedIndex = options.index ?? -1;
    this.description =
      options.newParentId == null
        ? `Move ${options.id} to root`
        : `Move ${options.id} under ${options.newParentId}`;
  }

  execute(state: TreeState<TRow>): TreeState<TRow> {
    const node = state.nodes.get(this.id);
    if (!node) {
      throw new Error(
        `MoveNodeCommand: node "${this.id}" not found in tree state.`,
      );
    }

    // Run built-in validation first, then any custom validators.
    const builtIn = validateCycleAndSelf(
      this.id,
      this.newParentId,
      this.position,
      state,
    );
    if (!builtIn.allowed) throw new MoveRejectedError(builtIn.reason);
    for (const v of this.validators) {
      const result = v(this.id, this.newParentId, this.position, state);
      if (!result.allowed) throw new MoveRejectedError(result.reason);
    }

    // If the new parent exists, ensure it's present.
    if (this.newParentId != null && !state.nodes.has(this.newParentId)) {
      throw new Error(
        `MoveNodeCommand: new parent "${this.newParentId}" not found in tree state.`,
      );
    }

    const nodes = new Map(state.nodes);
    let rootIds = state.rootIds;

    // Capture original location for undo.
    this.originalParentId = node.parentId;
    if (node.parentId == null) {
      this.originalIndex = state.rootIds.indexOf(this.id);
    } else {
      const oldParent = state.nodes.get(node.parentId);
      this.originalIndex = oldParent ? oldParent.childIds.indexOf(this.id) : -1;
    }

    // 1. Remove from old parent.
    if (node.parentId == null) {
      rootIds = state.rootIds.filter((id) => id !== this.id);
    } else {
      const oldParent = state.nodes.get(node.parentId);
      if (oldParent) {
        nodes.set(node.parentId, {
          ...oldParent,
          childIds: oldParent.childIds.filter((id) => id !== this.id),
        });
      }
    }

    // 2. Update the moved node's parentId.
    nodes.set(this.id, { ...node, parentId: this.newParentId });

    // 3. Insert into new parent.
    if (this.newParentId == null) {
      const next = [...rootIds];
      const idx = clampIndex(this.resolvedIndex, next.length);
      this.resolvedIndex = idx;
      next.splice(idx, 0, this.id);
      rootIds = next;
    } else {
      // Read from the working `nodes` map — the old parent may have just
      // been updated above (e.g., when reordering within the same parent).
      const newParent = nodes.get(this.newParentId)!;
      const nextChildIds = [...newParent.childIds];
      const idx = clampIndex(this.resolvedIndex, nextChildIds.length);
      this.resolvedIndex = idx;
      nextChildIds.splice(idx, 0, this.id);
      nodes.set(this.newParentId, { ...newParent, childIds: nextChildIds });
    }

    return { nodes, rootIds };
  }

  undo(state: TreeState<TRow>): TreeState<TRow> {
    const node = state.nodes.get(this.id);
    if (!node) return state;

    const nodes = new Map(state.nodes);
    let rootIds = state.rootIds;

    // 1. Remove from current parent (newParentId).
    if (this.newParentId == null) {
      rootIds = state.rootIds.filter((id) => id !== this.id);
    } else {
      const currentParent = state.nodes.get(this.newParentId);
      if (currentParent) {
        nodes.set(this.newParentId, {
          ...currentParent,
          childIds: currentParent.childIds.filter((id) => id !== this.id),
        });
      }
    }

    // 2. Restore the original parentId on the moved node.
    nodes.set(this.id, { ...node, parentId: this.originalParentId });

    // 3. Reinsert into the original parent at the original index.
    if (this.originalParentId == null) {
      const next = [...rootIds];
      const idx =
        this.originalIndex >= 0 && this.originalIndex <= next.length
          ? this.originalIndex
          : next.length;
      next.splice(idx, 0, this.id);
      rootIds = next;
    } else {
      const oldParent = nodes.get(this.originalParentId);
      if (oldParent) {
        const nextChildIds = [...oldParent.childIds];
        const idx =
          this.originalIndex >= 0 && this.originalIndex <= nextChildIds.length
            ? this.originalIndex
            : nextChildIds.length;
        nextChildIds.splice(idx, 0, this.id);
        nodes.set(this.originalParentId, {
          ...oldParent,
          childIds: nextChildIds,
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
