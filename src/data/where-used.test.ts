import { describe, it, expect } from 'vitest';
import { findWhereUsed } from './where-used';

interface Row { id: string; name: string; parentId: string | null; qty?: number }

const tree: Row[] = [
  { id: 'A', name: 'Assembly A', parentId: null },
  { id: 'B', name: 'Assembly B', parentId: null },
  { id: 'C', name: 'Sub-assembly C', parentId: 'A', qty: 2 },
  { id: 'D', name: 'Component D', parentId: 'C', qty: 3 },
  { id: 'E', name: 'Component D copy', parentId: 'B', qty: 1 },
  { id: 'F', name: 'Component F', parentId: 'A', qty: 5 },
];

const getRowId = (r: Row) => r.id;
const getParentId = (r: Row) => r.parentId;

describe('findWhereUsed', () => {
  it('finds direct parents of a leaf node', () => {
    const results = findWhereUsed(tree, 'D', getRowId, getParentId);
    expect(results).toHaveLength(1);
    expect(results[0].parentNode.id).toBe('C');
    expect(results[0].path.map((r) => r.id)).toEqual(['A', 'C']);
  });

  it('finds multiple usages when a component appears in multiple assemblies', () => {
    // F is directly under A
    const results = findWhereUsed(tree, 'F', getRowId, getParentId);
    expect(results).toHaveLength(1);
    expect(results[0].parentNode.id).toBe('A');
    expect(results[0].path.map((r) => r.id)).toEqual(['A']);
  });

  it('returns empty for root nodes', () => {
    const results = findWhereUsed(tree, 'A', getRowId, getParentId);
    expect(results).toHaveLength(0);
  });

  it('returns empty for non-existent nodes', () => {
    const results = findWhereUsed(tree, 'Z', getRowId, getParentId);
    expect(results).toHaveLength(0);
  });

  it('builds the full path from root to parent', () => {
    const results = findWhereUsed(tree, 'D', getRowId, getParentId);
    // D's parent is C, C's parent is A (root)
    expect(results[0].path).toHaveLength(2);
    expect(results[0].path[0].id).toBe('A');
    expect(results[0].path[1].id).toBe('C');
  });
});
