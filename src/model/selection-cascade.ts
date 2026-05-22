export type GetSubRowIds = (rowId: string) => string[];
export type GetParentId = (rowId: string) => string | null;

function collectDescendants(rowId: string, getSubRowIds: GetSubRowIds): string[] {
  const descendants: string[] = [];
  const stack = [...getSubRowIds(rowId)];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    descendants.push(current);
    stack.push(...getSubRowIds(current));
  }

  return descendants;
}

function updateAncestors(
  rowId: string,
  selected: Set<string>,
  getSubRowIds: GetSubRowIds,
  getParentId: GetParentId,
) {
  let parentId = getParentId(rowId);

  while (parentId !== null) {
    const childIds = getSubRowIds(parentId);
    if (childIds.length > 0 && childIds.every((childId) => selected.has(childId))) {
      selected.add(parentId);
    } else {
      selected.delete(parentId);
    }
    parentId = getParentId(parentId);
  }
}

/**
 * Computes the next selected row id set after toggling one row.
 *
 * Selecting or deselecting a parent applies the same operation to every
 * descendant. Ancestors are selected only when all direct children are selected.
 */
export function cascadeSelect(
  rowId: string,
  shouldSelect: boolean,
  selectedIds: Set<string>,
  getSubRowIds: GetSubRowIds,
  getParentId: GetParentId,
): Set<string> {
  const next = new Set(selectedIds);
  const affectedIds = [rowId, ...collectDescendants(rowId, getSubRowIds)];

  for (const affectedId of affectedIds) {
    if (shouldSelect) {
      next.add(affectedId);
    } else {
      next.delete(affectedId);
    }
  }

  updateAncestors(rowId, next, getSubRowIds, getParentId);
  return next;
}

function subtreeStatus(
  rowId: string,
  selectedIds: Set<string>,
  getSubRowIds: GetSubRowIds,
): 'none' | 'some' | 'all' {
  const childIds = getSubRowIds(rowId);

  if (childIds.length === 0) {
    return selectedIds.has(rowId) ? 'all' : 'none';
  }

  const childStatuses = childIds.map((childId) =>
    subtreeStatus(childId, selectedIds, getSubRowIds),
  );
  const selfSelected = selectedIds.has(rowId);
  const allChildrenSelected = childStatuses.every((status) => status === 'all');
  const noChildrenSelected = childStatuses.every((status) => status === 'none');

  if (selfSelected && allChildrenSelected) return 'all';
  if (!selfSelected && noChildrenSelected) return 'none';
  return 'some';
}

/**
 * Computes parent rows whose descendant selection is partial.
 */
export function computeIndeterminate(
  selectedIds: Set<string>,
  getSubRowIds: GetSubRowIds,
  getParentId: GetParentId,
): Set<string> {
  const indeterminate = new Set<string>();
  const candidates = new Set<string>();

  for (const selectedId of selectedIds) {
    let parentId = getParentId(selectedId);
    while (parentId !== null) {
      candidates.add(parentId);
      parentId = getParentId(parentId);
    }
  }

  for (const rowId of candidates) {
    if (getSubRowIds(rowId).length === 0) continue;
    if (subtreeStatus(rowId, selectedIds, getSubRowIds) === 'some') {
      indeterminate.add(rowId);
    }
  }

  return indeterminate;
}
