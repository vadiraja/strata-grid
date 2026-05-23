import { describe, it, expect } from 'vitest';
import type { TreeNode, TreeState } from '../types';
import { DeleteNodeCommand } from './delete-node';

interface Row { id: string }

function makeNode(
  id: string,
  parentId: string | null,
  childIds: string[] = [],
): TreeNode<Row> {
  return { id, parentId, childIds, data: { id } };
}

function makeState(): TreeState<Row> {
  // root1 -> [a -> [a1, a2], b]; root2
  const nodes = new Map<string, TreeNode<Row>>();
  nodes.set('root1', makeNode('root1', null, ['a', 'b']));
  nodes.set('a', makeNode('a', 'root1', ['a1', 'a2']));
  nodes.set('a1', makeNode('a1', 'a'));
  nodes.set('a2', makeNode('a2', 'a'));
  nodes.set('b', makeNode('b', 'root1'));
  nodes.set('root2', makeNode('root2', null));
  return { nodes, rootIds: ['root1', 'root2'] };
}

describe('DeleteNodeCommand — execute', () => {
  it('removes a leaf node from its parent and from nodes', () => {
    const state = makeState();
    const cmd = new DeleteNodeCommand({ id: 'a1' });
    const next = cmd.execute(state);
    expect(next.nodes.has('a1')).toBe(false);
    expect(next.nodes.get('a')!.childIds).toEqual(['a2']);
  });

  it('removes an entire subtree', () => {
    const state = makeState();
    const cmd = new DeleteNodeCommand({ id: 'a' });
    const next = cmd.execute(state);
    expect(next.nodes.has('a')).toBe(false);
    expect(next.nodes.has('a1')).toBe(false);
    expect(next.nodes.has('a2')).toBe(false);
    expect(next.nodes.get('root1')!.childIds).toEqual(['b']);
  });

  it('removes a root node', () => {
    const state = makeState();
    const cmd = new DeleteNodeCommand({ id: 'root1' });
    const next = cmd.execute(state);
    expect(next.rootIds).toEqual(['root2']);
    expect(next.nodes.has('root1')).toBe(false);
    expect(next.nodes.has('a')).toBe(false);
    expect(next.nodes.has('a1')).toBe(false);
    expect(next.nodes.has('b')).toBe(false);
  });

  it('does not mutate the input state', () => {
    const state = makeState();
    const beforeChildIds = state.nodes.get('root1')!.childIds;
    const cmd = new DeleteNodeCommand({ id: 'a' });
    cmd.execute(state);
    expect(state.nodes.get('root1')!.childIds).toBe(beforeChildIds);
    expect(state.nodes.has('a')).toBe(true);
  });

  it('throws when the node is missing', () => {
    const state = makeState();
    const cmd = new DeleteNodeCommand({ id: 'nope' });
    expect(() => cmd.execute(state)).toThrow(/node "nope" not found/);
  });
});

describe('DeleteNodeCommand — undo', () => {
  it('restores a deleted leaf at its original position', () => {
    const state = makeState();
    const cmd = new DeleteNodeCommand({ id: 'a1' });
    const next = cmd.execute(state);
    const undone = cmd.undo(next);
    expect(undone.nodes.get('a')!.childIds).toEqual(['a1', 'a2']);
    expect(undone.nodes.get('a1')).toMatchObject({ id: 'a1', parentId: 'a' });
  });

  it('restores a deleted subtree', () => {
    const state = makeState();
    const cmd = new DeleteNodeCommand({ id: 'a' });
    const next = cmd.execute(state);
    const undone = cmd.undo(next);
    expect(undone.nodes.get('root1')!.childIds).toEqual(['a', 'b']);
    expect(undone.nodes.get('a')!.childIds).toEqual(['a1', 'a2']);
    expect(undone.nodes.has('a1')).toBe(true);
    expect(undone.nodes.has('a2')).toBe(true);
  });

  it('restores a deleted root at its original index', () => {
    const state = makeState();
    const cmd = new DeleteNodeCommand({ id: 'root1' });
    const next = cmd.execute(state);
    const undone = cmd.undo(next);
    expect(undone.rootIds).toEqual(['root1', 'root2']);
    expect(undone.nodes.get('root1')!.childIds).toEqual(['a', 'b']);
  });

  it('restores correct position when deleting a middle sibling', () => {
    // root1 -> [a, b, c]; delete b, undo, expect [a, b, c] again
    const nodes = new Map<string, TreeNode<Row>>();
    nodes.set('root1', makeNode('root1', null, ['a', 'b', 'c']));
    nodes.set('a', makeNode('a', 'root1'));
    nodes.set('b', makeNode('b', 'root1'));
    nodes.set('c', makeNode('c', 'root1'));
    const state: TreeState<Row> = { nodes, rootIds: ['root1'] };

    const cmd = new DeleteNodeCommand({ id: 'b' });
    const next = cmd.execute(state);
    expect(next.nodes.get('root1')!.childIds).toEqual(['a', 'c']);
    const undone = cmd.undo(next);
    expect(undone.nodes.get('root1')!.childIds).toEqual(['a', 'b', 'c']);
  });
});
