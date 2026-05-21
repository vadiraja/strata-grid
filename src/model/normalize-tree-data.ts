import type { TreeDataConfig } from './types';
import { devWarn } from './dev-warn';

/**
 * The result of normalizing tree data: a flat-or-nested input reduced to the
 * single shape TanStack Table consumes — the root rows plus a `getSubRows`
 * accessor.
 */
export interface NormalizedTree<TRow> {
  /** The top-level rows (depth 0). */
  rootRows: TRow[];
  /** Returns a row's child rows, or `undefined` for a leaf. */
  getSubRows: (row: TRow) => TRow[] | undefined;
}

/**
 * Reduces Strata's two accepted tree-data shapes to one.
 *
 * - Nested data (`getChildren`) is used directly.
 * - Flat data (`getParentId`) is assembled into a tree by `buildTreeFromFlat`,
 *   which repairs duplicate ids, orphan rows, and cycles.
 *
 * `getChildren` takes precedence if both accessors are supplied.
 */
export function normalizeTreeData<TRow>(
  rows: TRow[],
  config: TreeDataConfig<TRow>,
): NormalizedTree<TRow> {
  const { getChildren, getParentId } = config;

  if (getChildren) {
    if (getParentId) {
      devWarn(
        'treeData has both getChildren and getParentId; using getChildren.',
      );
    }
    return { rootRows: rows, getSubRows: getChildren };
  }

  if (getParentId) {
    return buildTreeFromFlat(rows, config.getRowId, getParentId);
  }

  devWarn(
    'treeData has neither getChildren nor getParentId; treating all rows as roots.',
  );
  return { rootRows: rows, getSubRows: () => undefined };
}

/**
 * Assembles flat, parent-pointer rows into a tree.
 *
 * Repairs messy ERP data without ever crashing or looping:
 * - duplicate ids — the last occurrence wins;
 * - orphan rows (parent id not present) — promoted to roots;
 * - cycles (a row that is its own ancestor) — the closing edge is dropped.
 *
 * Each repair emits a development-mode warning. Root and sibling order
 * follows input order, so the result is deterministic.
 */
function buildTreeFromFlat<TRow>(
  rows: TRow[],
  getRowId: (row: TRow) => string,
  getParentId: (row: TRow) => string | null | undefined,
): NormalizedTree<TRow> {
  // 1. Index rows by id; last occurrence wins on duplicates.
  const byId = new Map<string, TRow>();
  for (const row of rows) {
    const id = getRowId(row);
    if (byId.has(id)) {
      devWarn(`Duplicate row id "${id}"; the last occurrence wins.`);
    }
    byId.set(id, row);
  }
  const uniqueRows = [...byId.values()];

  // 2. Resolve each row's effective parent, promoting orphans to roots.
  const effectiveParent = new Map<string, string | null>();
  for (const row of uniqueRows) {
    const id = getRowId(row);
    const parentId = getParentId(row);
    if (parentId == null) {
      effectiveParent.set(id, null);
    } else if (!byId.has(parentId)) {
      devWarn(
        `Row "${id}" references missing parent "${parentId}"; treating it as a root.`,
      );
      effectiveParent.set(id, null);
    } else {
      effectiveParent.set(id, parentId);
    }
  }

  // 3. Break cycles: walk each row's ancestor chain; if it revisits a node,
  //    drop that node's parent edge so the chain terminates.
  for (const row of uniqueRows) {
    const seen = new Set<string>();
    let current: string | null | undefined = getRowId(row);
    while (current != null) {
      if (seen.has(current)) {
        devWarn(
          `Cycle detected in tree data at row "${current}"; treating it as a root.`,
        );
        effectiveParent.set(current, null);
        break;
      }
      seen.add(current);
      current = effectiveParent.get(current) ?? null;
    }
  }

  // 4. Build the children index and the root list, preserving input order.
  const childrenById = new Map<string, TRow[]>();
  const rootRows: TRow[] = [];
  for (const row of uniqueRows) {
    const parentId = effectiveParent.get(getRowId(row)) ?? null;
    if (parentId == null) {
      rootRows.push(row);
    } else {
      const siblings = childrenById.get(parentId);
      if (siblings) {
        siblings.push(row);
      } else {
        childrenById.set(parentId, [row]);
      }
    }
  }

  return {
    rootRows,
    getSubRows: (row) => childrenById.get(getRowId(row)),
  };
}
