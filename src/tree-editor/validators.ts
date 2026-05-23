import type { MoveValidationResult, TreeState } from './types';

/**
 * Returns true when `potentialAncestorId` is `nodeId` itself or one of its
 * descendants. Walks the subtree rooted at `nodeId` iteratively.
 */
export function isDescendant<TRow>(
  nodeId: string,
  potentialDescendantId: string,
  state: TreeState<TRow>,
): boolean {
  if (nodeId === potentialDescendantId) return true;
  const stack: string[] = [nodeId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const node = state.nodes.get(current);
    if (!node) continue;
    for (const childId of node.childIds) {
      if (childId === potentialDescendantId) return true;
      stack.push(childId);
    }
  }
  return false;
}

/**
 * Built-in move validator. Rejects self-moves and moves that would create a
 * cycle (moving a node onto one of its own descendants).
 *
 * - `sourceId` is the node being moved.
 * - `targetId` is the drop target (or `null` to move to root).
 * - `position` is `'child' | 'before' | 'after'` (informational here — the
 *   cycle/self checks apply regardless of position).
 */
export function validateCycleAndSelf<TRow>(
  sourceId: string,
  targetId: string | null,
  _position: 'child' | 'before' | 'after',
  state: TreeState<TRow>,
): MoveValidationResult {
  if (targetId == null) return { allowed: true };
  if (sourceId === targetId) {
    return { allowed: false, reason: 'Cannot move a node onto itself.' };
  }
  if (isDescendant(sourceId, targetId, state)) {
    return {
      allowed: false,
      reason: 'Cannot move a node into its own descendant.',
    };
  }
  return { allowed: true };
}
