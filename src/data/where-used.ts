import type { WhereUsedResult } from './types';

/**
 * Finds all parent assemblies that directly contain a given node.
 * Traverses the in-memory tree to build paths from root to each usage.
 *
 * @param rows - All rows in the tree
 * @param nodeId - The node to find usages of
 * @param getRowId - Function to extract row id
 * @param getParentId - Function to extract parent id
 * @returns Array of where-used results with parent and path
 */
export function findWhereUsed<TRow>(
  rows: TRow[],
  nodeId: string,
  getRowId: (row: TRow) => string,
  getParentId: (row: TRow) => string | null | undefined,
): WhereUsedResult<TRow>[] {
  // Build lookup maps
  const rowById = new Map<string, TRow>();
  for (const row of rows) {
    rowById.set(getRowId(row), row);
  }

  // Find the target node
  const targetNode = rowById.get(nodeId);
  if (!targetNode) return [];

  // Get the direct parent
  const parentId = getParentId(targetNode);
  if (!parentId) return []; // Root node — no parents

  const parentNode = rowById.get(parentId);
  if (!parentNode) return [];

  // Build path from root to parent
  const path = buildPathToRoot(parentId, rowById, getParentId);

  return [{ parentNode, path }];
}

/**
 * Builds the path from root to a given node (inclusive).
 * Returns ancestors in order from root to the node.
 */
function buildPathToRoot<TRow>(
  nodeId: string,
  rowById: Map<string, TRow>,
  getParentId: (row: TRow) => string | null | undefined,
): TRow[] {
  const path: TRow[] = [];
  let currentId: string | null | undefined = nodeId;

  while (currentId) {
    const node = rowById.get(currentId);
    if (!node) break;
    path.unshift(node);
    currentId = getParentId(node);
  }

  return path;
}
