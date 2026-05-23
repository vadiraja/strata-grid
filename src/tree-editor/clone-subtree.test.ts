import { describe, it, expect } from 'vitest';
import { buildTreeState } from './build-tree-state';
import { cloneSubtree } from './clone-subtree';

interface Row {
  id: string;
  parentId: string | null;
  name: string;
}

function fixture() {
  const rows: Row[] = [
    { id: 'a', parentId: null, name: 'A' },
    { id: 'a1', parentId: 'a', name: 'A1' },
    { id: 'a2', parentId: 'a', name: 'A2' },
    { id: 'a1a', parentId: 'a1', name: 'A1A' },
  ];
  return buildTreeState<Row>(rows, {
    getRowId: (r) => r.id,
    getParentId: (r) => r.parentId,
  });
}

describe('cloneSubtree', () => {
  it('clones a single leaf with a new id', () => {
    let n = 0;
    const state = fixture();
    const result = cloneSubtree<Row>({
      state,
      rootId: 'a2',
      generateId: () => `new${++n}`,
    });
    expect(result.newRootId).toBe('new1');
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toEqual({
      id: 'new1',
      parentId: null,
      childIds: [],
      data: { id: 'a2', parentId: 'a', name: 'A2' },
    });
  });

  it('clones a subtree and rewires parent ids to the new ids', () => {
    let n = 0;
    const result = cloneSubtree<Row>({
      state: fixture(),
      rootId: 'a',
      generateId: () => `c${++n}`,
    });
    expect(result.newRootId).toBe('c1');
    const byNewId = new Map(result.nodes.map((node) => [node.id, node]));
    expect(byNewId.size).toBe(4);
    // Root has no parent.
    expect(byNewId.get('c1')?.parentId).toBeNull();
    // Every non-root parent points to a freshly minted id, never to an
    // original id like 'a' or 'a1'.
    for (const node of result.nodes) {
      if (node.id === 'c1') continue;
      expect(node.parentId).not.toBeNull();
      expect(byNewId.has(node.parentId!)).toBe(true);
    }
    // Pre-order shape preserved.
    const root = byNewId.get('c1')!;
    expect(root.childIds.length).toBe(2);
    const sub = byNewId.get(root.childIds[0])!;
    expect(sub.childIds.length).toBe(1);
  });

  it('leaves the source state untouched', () => {
    const state = fixture();
    const beforeIds = [...state.nodes.keys()].sort();
    cloneSubtree<Row>({
      state,
      rootId: 'a',
      generateId: () => 'x',
    });
    expect([...state.nodes.keys()].sort()).toEqual(beforeIds);
  });

  it('uses the custom cloneData transformer', () => {
    let n = 0;
    const result = cloneSubtree<Row>({
      state: fixture(),
      rootId: 'a2',
      generateId: () => `new${++n}`,
      cloneData: (data) => ({ ...data, name: `${data.name}-copy` }),
    });
    expect(result.nodes[0].data.name).toBe('A2-copy');
  });

  it('throws when the root id is not present', () => {
    expect(() =>
      cloneSubtree<Row>({
        state: fixture(),
        rootId: 'missing',
        generateId: () => 'x',
      }),
    ).toThrow(/not in state/);
  });
});
