import { describe, it, expect } from 'vitest';
import type { MoveValidator, TreeNode, TreeState } from '../types';
import { OutdentNodeCommand } from './outdent-node';
import { MoveRejectedError } from './move-node';

interface Row {
  id: string;
}

function makeNode(
  id: string,
  parentId: string | null,
  childIds: string[] = [],
): TreeNode<Row> {
  return { id, parentId, childIds, data: { id } };
}

/**
 * root1 -> [a, b]
 *   a -> [a1, a2, a3]
 *     a1
 *     a2 -> [a2x]
 *       a2x
 *     a3
 *   b
 * root2
 */
function makeState(): TreeState<Row> {
  const nodes = new Map<string, TreeNode<Row>>();
  nodes.set('root1', makeNode('root1', null, ['a', 'b']));
  nodes.set('a', makeNode('a', 'root1', ['a1', 'a2', 'a3']));
  nodes.set('a1', makeNode('a1', 'a'));
  nodes.set('a2', makeNode('a2', 'a', ['a2x']));
  nodes.set('a2x', makeNode('a2x', 'a2'));
  nodes.set('a3', makeNode('a3', 'a'));
  nodes.set('b', makeNode('b', 'root1'));
  nodes.set('root2', makeNode('root2', null));
  return { nodes, rootIds: ['root1', 'root2'] };
}

describe('OutdentNodeCommand — execute', () => {
  it('moves a child to become the next sibling of its parent', () => {
    const state = makeState();
    const cmd = new OutdentNodeCommand<Row>({ id: 'a1' });
    const next = cmd.execute(state);
    // a1 leaves a's children.
    expect(next.nodes.get('a')!.childIds).toEqual(['a2', 'a3']);
    // a1 is inserted after `a` under root1.
    expect(next.nodes.get('root1')!.childIds).toEqual(['a', 'a1', 'b']);
    expect(next.nodes.get('a1')!.parentId).toBe('root1');
  });

  it('outdents a deeply nested node up one level', () => {
    const state = makeState();
    const cmd = new OutdentNodeCommand<Row>({ id: 'a2x' });
    const next = cmd.execute(state);
    // a2x leaves a2's children.
    expect(next.nodes.get('a2')!.childIds).toEqual([]);
    // a2x is inserted after a2 under a.
    expect(next.nodes.get('a')!.childIds).toEqual(['a1', 'a2', 'a2x', 'a3']);
    expect(next.nodes.get('a2x')!.parentId).toBe('a');
  });

  it('outdents a node from a top-level parent to root', () => {
    const state = makeState();
    const cmd = new OutdentNodeCommand<Row>({ id: 'b' });
    const next = cmd.execute(state);
    // b leaves root1's children.
    expect(next.nodes.get('root1')!.childIds).toEqual(['a']);
    // b is inserted after root1 in the rootIds list.
    expect(next.rootIds).toEqual(['root1', 'b', 'root2']);
    expect(next.nodes.get('b')!.parentId).toBeNull();
  });

  it('is a no-op when the node is already at root', () => {
    const state = makeState();
    const cmd = new OutdentNodeCommand<Row>({ id: 'root2' });
    const next = cmd.execute(state);
    expect(next).toBe(state);
  });

  it('carries the subtree along when outdenting a node with children', () => {
    const state = makeState();
    // a2 has child a2x.
    const cmd = new OutdentNodeCommand<Row>({ id: 'a2' });
    const next = cmd.execute(state);
    expect(next.nodes.get('a')!.childIds).toEqual(['a1', 'a3']);
    expect(next.nodes.get('root1')!.childIds).toEqual(['a', 'a2', 'b']);
    expect(next.nodes.get('a2')!.parentId).toBe('root1');
    // Subtree preserved.
    expect(next.nodes.get('a2')!.childIds).toEqual(['a2x']);
    expect(next.nodes.get('a2x')!.parentId).toBe('a2');
  });

  it('does not mutate the input state', () => {
    const state = makeState();
    const beforeAChildren = state.nodes.get('a')!.childIds;
    const cmd = new OutdentNodeCommand<Row>({ id: 'a1' });
    cmd.execute(state);
    expect(state.nodes.get('a')!.childIds).toBe(beforeAChildren);
    expect(state.nodes.get('a1')!.parentId).toBe('a');
  });

  it('throws when the node does not exist', () => {
    const state = makeState();
    const cmd = new OutdentNodeCommand<Row>({ id: 'nope' });
    expect(() => cmd.execute(state)).toThrow(/node "nope" not found/);
  });

  it('rejects when a custom validator returns allowed: false', () => {
    const state = makeState();
    const block: MoveValidator<Row> = () => ({
      allowed: false,
      reason: 'no outdent',
    });
    const cmd = new OutdentNodeCommand<Row>({
      id: 'a1',
      validators: [block],
    });
    expect(() => cmd.execute(state)).toThrow(MoveRejectedError);
    expect(state.nodes.get('a')!.childIds).toEqual(['a1', 'a2', 'a3']);
  });
});

describe('OutdentNodeCommand — undo', () => {
  it('restores the original parent and sibling index', () => {
    const state = makeState();
    const cmd = new OutdentNodeCommand<Row>({ id: 'a1' });
    const next = cmd.execute(state);
    const undone = cmd.undo(next);
    expect(undone.nodes.get('a')!.childIds).toEqual(['a1', 'a2', 'a3']);
    expect(undone.nodes.get('root1')!.childIds).toEqual(['a', 'b']);
    expect(undone.nodes.get('a1')!.parentId).toBe('a');
  });

  it('restores after outdenting to root', () => {
    const state = makeState();
    const cmd = new OutdentNodeCommand<Row>({ id: 'b' });
    const next = cmd.execute(state);
    const undone = cmd.undo(next);
    expect(undone.rootIds).toEqual(['root1', 'root2']);
    expect(undone.nodes.get('root1')!.childIds).toEqual(['a', 'b']);
    expect(undone.nodes.get('b')!.parentId).toBe('root1');
  });

  it('undo of a no-op is also a no-op', () => {
    const state = makeState();
    const cmd = new OutdentNodeCommand<Row>({ id: 'root2' });
    const next = cmd.execute(state);
    const undone = cmd.undo(next);
    expect(undone).toBe(next);
  });
});
