/**
 * Drop position relative to a target row during drag-and-drop:
 * - `before` — insert as previous sibling of target
 * - `after`  — insert as next sibling of target
 * - `child`  — reparent under target (append as last child)
 */
export type DropPosition = 'before' | 'after' | 'child';

/**
 * Map a vertical cursor position over a target row to a drop position.
 *
 * Top 25% → 'before', bottom 25% → 'after', middle 50% → 'child'.
 * Boundary at exactly 25% is treated as 'child' (>= 0.25), and at 75%
 * as 'after' (> 0.75 strictly), so a click dead-center is always 'child'.
 *
 * Returns 'child' for non-positive `rowHeight` to avoid NaN/Infinity.
 */
export function calculateDropPosition(
  cursorY: number,
  rowTop: number,
  rowHeight: number,
): DropPosition {
  if (rowHeight <= 0) return 'child';
  const ratio = (cursorY - rowTop) / rowHeight;
  if (ratio < 0.25) return 'before';
  if (ratio > 0.75) return 'after';
  return 'child';
}
