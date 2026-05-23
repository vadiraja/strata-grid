import type { TreeNode, TreeState } from './types';

/**
 * Configuration for {@link buildTreeState}. A subset of `TreeDataConfig` — the
 * tree editor always works from nested-or-flat user data and an id accessor.
 */
export interface BuildTreeStateConfig<TRow> {
  /** Returns a stable, unique id for a row. */
  getRowId: (row: TRow) => string;
  /** Nested data: returns a row's children, or `undefined` for a leaf. */
  getChildren?: (row: TRow) => TRow[] | undefined;
  /** Flat data: returns a row's parent id, or `null`/`undefined` for a root. */
  getParentId?: (row: TRow) => string | null | undefined;
}

/**
 * Converts the user's `data` array plus a `treeData` config into a
 * {@link TreeState}.
 *
 * - When `getChildren` is provided, the data is treated as nested and walked
 *   recursively. Children order is preserved.
 * - When only `getParentId` is provided, the data is treated as flat,
 *   parent-pointer rows: root order and sibling order follow input order.
 * - When neither accessor is provided, every row becomes a root.
 *
 * The result is a fresh {@link TreeState} with no shared structure with the
 * input — commands can safely mutate clones without leaking back to user data.
 */
export function buildTreeState<TRow>(
  data: TRow[],
  config: BuildTreeStateConfig<TRow>,
): TreeState<TRow> {
  const { getRowId, getChildren, getParentId } = config;
  const nodes = new Map<string, TreeNode<TRow>>();
  const rootIds: string[] = [];

  if (getChildren) {
    // Nested input — depth-first walk preserving input order.
    const visit = (row: TRow, parentId: string | null): string => {
      const id = getRowId(row);
      const children = getChildren(row) ?? [];
      const childIds = children.map((child) => visit(child, id));
      nodes.set(id, { id, parentId, childIds, data: row });
      return id;
    };
    for (const row of data) {
      rootIds.push(visit(row, null));
    }
    return { nodes, rootIds };
  }

  if (getParentId) {
    // Flat input — first pass registers nodes; second pass wires children.
    for (const row of data) {
      const id = getRowId(row);
      nodes.set(id, { id, parentId: null, childIds: [], data: row });
    }
    for (const row of data) {
      const id = getRowId(row);
      const node = nodes.get(id)!;
      const rawParent = getParentId(row);
      const parentId = rawParent == null ? null : rawParent;
      if (parentId != null && nodes.has(parentId)) {
        node.parentId = parentId;
        nodes.get(parentId)!.childIds.push(id);
      } else {
        node.parentId = null;
        rootIds.push(id);
      }
    }
    return { nodes, rootIds };
  }

  // No accessor — flat list of roots.
  for (const row of data) {
    const id = getRowId(row);
    nodes.set(id, { id, parentId: null, childIds: [], data: row });
    rootIds.push(id);
  }
  return { nodes, rootIds };
}
