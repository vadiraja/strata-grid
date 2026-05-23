import { describe, it, expect } from 'vitest';
import { InsertSubtreeCommand } from './insert-subtree';
import { buildTreeState } from '../build-tree-state';
import type { TreeNode } from '../types';

interface Row {
  id: string;
  parentId: string | null;
  name: string;
}

function fixture() {
  return buildTreeState<Row>(
    [
      { id: 'a', parentId: null, name: 'A' },
      { id: 'b', parentId: null, name: 'B' },
    ],
    { getRowId: (r) => r.id, getParentId: (r) => r.parentId },
  );
}

function cloneNodes(): TreeNode<Row>[] {
  return [
    {
      id: 'x',
      parentId: null,
      childIds: ['x1'],
      data: { id: 'x', parentId: null, name: 'X' },
    },
    {
      id: 'x1',
      parentId: 'x',
      childIds: [],
      data: { id: 'x1', parentId: 'x', name: 'X1' },
    },
  ];
}

describe('InsertSubtreeCommand', () => {
  it('inserts the subtree under the target parent', () => {
    const cmd = new InsertSubtreeCommand<Row>({
      nodes: cloneNodes(),
      rootId: 'x',
      targetParentId: 'a',
    });
    const next = cmd.execute(fixture());
    expect(next.nodes.get('a')?.childIds).toEqual(['x']);
    expect(next.nodes.get('x')?.parentId).toBe('a');
    expect(next.nodes.get('x1')?.parentId).toBe('x');
  });

  it('inserts at root when targetParentId is null', () => {
    const cmd = new InsertSubtreeCommand<Row>({
      nodes: cloneNodes(),
      rootId: 'x',
      targetParentId: null,
      index: 1,
    });
    const next = cmd.execute(fixture());
    expect(next.rootIds).toEqual(['a', 'x', 'b']);
    expect(next.nodes.get('x')?.parentId).toBeNull();
  });

  it('undo removes every inserted node', () => {
    const cmd = new InsertSubtreeCommand<Row>({
      nodes: cloneNodes(),
      rootId: 'x',
      targetParentId: 'a',
    });
    const state = fixture();
    const after = cmd.execute(state);
    const restored = cmd.undo(after);
    expect(restored.nodes.has('x')).toBe(false);
    expect(restored.nodes.has('x1')).toBe(false);
    expect(restored.nodes.get('a')?.childIds).toEqual([]);
  });

  it('throws when the target parent does not exist', () => {
    const cmd = new InsertSubtreeCommand<Row>({
      nodes: cloneNodes(),
      rootId: 'x',
      targetParentId: 'missing',
    });
    expect(() => cmd.execute(fixture())).toThrow(/not found/);
  });

  it('throws when an inserted id collides with existing state', () => {
    const cmd = new InsertSubtreeCommand<Row>({
      nodes: [
        {
          id: 'a',
          parentId: null,
          childIds: [],
          data: { id: 'a', parentId: null, name: 'dup' },
        },
      ],
      rootId: 'a',
      targetParentId: null,
    });
    expect(() => cmd.execute(fixture())).toThrow(/already exists/);
  });
});
