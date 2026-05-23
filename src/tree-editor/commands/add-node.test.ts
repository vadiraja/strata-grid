import { describe, it, expect } from 'vitest';
import type { TreeNode, TreeState } from '../types';
import { AddNodeCommand } from './add-node';

interface Row { id: string; name?: string }

function makeNode(
  id: string,
  parentId: string | null,
  childIds: string[] = [],
): TreeNode<Row> {
  return { id, parentId, childIds, data: { id } };
}

function makeState(): TreeState<Row> {
  // root1 -> [a, b]; root2
  const nodes = new Map<string, TreeNode<Row>>();
  nodes.set('root1', makeNode('root1', null, ['a', 'b']));
  nodes.set('a', makeNode('a', 'root1'));
  nodes.set('b', makeNode('b', 'root1'));
  nodes.set('root2', makeNode('root2', null));
  return { nodes, rootIds: ['root1', 'root2'] };
}

describe('AddNodeCommand — execute', () => {
  it('appends a new root when parentId is null and no index', () => {
    const state = makeState();
    const cmd = new AddNodeCommand<Row>({
      id: 'root3',
      parentId: null,
      data: { id: 'root3' },
    });
    const next = cmd.execute(state);
    expect(next.rootIds).toEqual(['root1', 'root2', 'root3']);
    expect(next.nodes.get('root3')).toMatchObject({
      id: 'root3',
      parentId: null,
      childIds: [],
    });
  });

  it('appends a child to a parent', () => {
    const state = makeState();
    const cmd = new AddNodeCommand<Row>({
      id: 'c',
      parentId: 'root1',
      data: { id: 'c' },
    });
    const next = cmd.execute(state);
    expect(next.nodes.get('root1')!.childIds).toEqual(['a', 'b', 'c']);
    expect(next.nodes.get('c')!.parentId).toBe('root1');
  });

  it('inserts at a specific index', () => {
    const state = makeState();
    const cmd = new AddNodeCommand<Row>({
      id: 'c',
      parentId: 'root1',
      data: { id: 'c' },
      index: 1,
    });
    const next = cmd.execute(state);
    expect(next.nodes.get('root1')!.childIds).toEqual(['a', 'c', 'b']);
  });

  it('inserts a root at a specific index', () => {
    const state = makeState();
    const cmd = new AddNodeCommand<Row>({
      id: 'root0',
      parentId: null,
      data: { id: 'root0' },
      index: 0,
    });
    const next = cmd.execute(state);
    expect(next.rootIds).toEqual(['root0', 'root1', 'root2']);
  });

  it('clamps out-of-range indices to append', () => {
    const state = makeState();
    const cmd = new AddNodeCommand<Row>({
      id: 'c',
      parentId: 'root1',
      data: { id: 'c' },
      index: 99,
    });
    const next = cmd.execute(state);
    expect(next.nodes.get('root1')!.childIds).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input state', () => {
    const state = makeState();
    const beforeRoot1ChildIds = state.nodes.get('root1')!.childIds;
    const cmd = new AddNodeCommand<Row>({
      id: 'c',
      parentId: 'root1',
      data: { id: 'c' },
    });
    cmd.execute(state);
    expect(state.nodes.get('root1')!.childIds).toBe(beforeRoot1ChildIds);
    expect(state.rootIds).toEqual(['root1', 'root2']);
  });

  it('throws when parent is missing', () => {
    const state = makeState();
    const cmd = new AddNodeCommand<Row>({
      id: 'c',
      parentId: 'nope',
      data: { id: 'c' },
    });
    expect(() => cmd.execute(state)).toThrow(/parent "nope" not found/);
  });
});

describe('AddNodeCommand — undo', () => {
  it('removes an added root node', () => {
    const state = makeState();
    const cmd = new AddNodeCommand<Row>({
      id: 'root3',
      parentId: null,
      data: { id: 'root3' },
    });
    const next = cmd.execute(state);
    const undone = cmd.undo(next);
    expect(undone.rootIds).toEqual(['root1', 'root2']);
    expect(undone.nodes.has('root3')).toBe(false);
  });

  it('removes an added child node', () => {
    const state = makeState();
    const cmd = new AddNodeCommand<Row>({
      id: 'c',
      parentId: 'root1',
      data: { id: 'c' },
    });
    const next = cmd.execute(state);
    const undone = cmd.undo(next);
    expect(undone.nodes.get('root1')!.childIds).toEqual(['a', 'b']);
    expect(undone.nodes.has('c')).toBe(false);
  });

  it('restores original sibling order after a mid-insert', () => {
    const state = makeState();
    const cmd = new AddNodeCommand<Row>({
      id: 'c',
      parentId: 'root1',
      data: { id: 'c' },
      index: 1,
    });
    const next = cmd.execute(state);
    const undone = cmd.undo(next);
    expect(undone.nodes.get('root1')!.childIds).toEqual(['a', 'b']);
  });
});
