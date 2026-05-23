import type { TreeState } from './types';

/**
 * Reduce a selection to its top-level members — for any node whose ancestor
 * (parent, grandparent, …) is also selected, drop it. Used when applying a
 * batch operation: deleting a parent already removes its subtree, so the
 * child entry would be redundant or fail.
 *
 * Order is preserved from the input. Ids not present in `state` are kept
 * as-is so callers can decide how to handle the mismatch.
 */
export function filterToTopLevelNodes<TRow>(
  state: TreeState<TRow>,
  ids: string[],
): string[] {
  const selected = new Set(ids);
  const out: string[] = [];
  for (const id of ids) {
    const node = state.nodes.get(id);
    if (!node) {
      out.push(id);
      continue;
    }
    let cursor: string | null = node.parentId;
    let ancestorSelected = false;
    while (cursor != null) {
      if (selected.has(cursor)) {
        ancestorSelected = true;
        break;
      }
      cursor = state.nodes.get(cursor)?.parentId ?? null;
    }
    if (!ancestorSelected) out.push(id);
  }
  return out;
}
