import { describe, it, expect } from 'vitest';
import type { MoveValidator, TreeNode, TreeState } from '../types';
import { IndentNodeCommand } from './indent-node';
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
 * root1 -> [a, b, c]
 *   a -> [a1]
 *     a1
 *   b
 *   c
 * root2
 * root3 -> [r3a]
 *   r3a
 */
function makeState(): TreeState<Row> {
  const nodes = new Map<string, TreeNode<Row>>();
  nodes.set('root1', makeNode('root1', null, ['a', 'b', 'c']));
  nodes.set('a', makeNode('a', 'root1', ['a1']));
  nodes.set('a1', makeNode('a1', 'a'));
  nodes.set('b', makeNode('b', 'root1'));
  nodes.set('c', makeNode('c', 'root1'));
  nodes.set('root2', makeNode('root2', null));
  nodes.set('root3', makeNode('root3', null, ['r3a']));
  nodes.set('r3a', makeNode('r3a', 'root3'));
  return { nodes, rootIds: ['root1', 'root2', 'root3'] };
}

describe('IndentNodeCommand — execute', () => {
  it('makes a child the last child of its previous sibling', () => {
    const state = makeState();
    const cmd = new IndentNodeCommand<Row>({ id: 'b' });
    const next = cmd.execute(state);
    expect(next.nodes.get('root1')!.childIds).toEqual(['a', 'c']);
    expect(next.nodes.get('a')!.childIds).toEqual(['a1', 'b']);
    expect(next.nodes.get('b')!.parentId).toBe('a');
  });

  it('appends after existing children of the previous sibling', () => {
    const state = makeState();
    // Indent c → becomes last child of b (b has no existing children).
    const cmd = new IndentNodeCommand<Row>({ id: 'c' });
    const next = cmd.execute(state);
    expect(next.nodes.get('root1')!.childIds).toEqual(['a', 'b']);
    expect(next.nodes.get('b')!.childIds).toEqual(['c']);
    expect(next.nodes.get('c')!.parentId).toBe('b');
  });

  it('is a no-op when the node is the first child', () => {
    const state = makeState();
    const cmd = new IndentNodeCommand<Row>({ id: 'a' });
    const next = cmd.execute(state);
    expect(next).toBe(state);
  });

  it('indents a root under its previous root', () => {
    const state = makeState();
    const cmd = new IndentNodeCommand<Row>({ id: 'root2' });
    const next = cmd.execute(state);
    expect(next.rootIds).toEqual(['root1', 'root3']);
    expect(next.nodes.get('root1')!.childIds).toEqual(['a', 'b', 'c', 'root2']);
    expect(next.nodes.get('root2')!.parentId).toBe('root1');
  });

  it('is a no-op for the first root', () => {
    const state = makeState();
    const cmd = new IndentNodeCommand<Row>({ id: 'root1' });
    const next = cmd.execute(state);
    expect(next).toBe(state);
  });

  it('indents a node with children — the subtree follows', () => {
    const state = makeState();
    // Indent root3 (which has a child r3a) under root2.
    const cmd = new IndentNodeCommand<Row>({ id: 'root3' });
    const next = cmd.execute(state);
    expect(next.rootIds).toEqual(['root1', 'root2']);
    expect(next.nodes.get('root2')!.childIds).toEqual(['root3']);
    expect(next.nodes.get('root3')!.parentId).toBe('root2');
    // Subtree preserved.
    expect(next.nodes.get('root3')!.childIds).toEqual(['r3a']);
    expect(next.nodes.get('r3a')!.parentId).toBe('root3');
  });

  it('does not mutate the input state', () => {
    const state = makeState();
    const beforeRoot1Children = state.nodes.get('root1')!.childIds;
    const cmd = new IndentNodeCommand<Row>({ id: 'b' });
    cmd.execute(state);
    expect(state.nodes.get('root1')!.childIds).toBe(beforeRoot1Children);
    expect(state.nodes.get('b')!.parentId).toBe('root1');
  });

  it('throws when the node does not exist', () => {
    const state = makeState();
    const cmd = new IndentNodeCommand<Row>({ id: 'nope' });
    expect(() => cmd.execute(state)).toThrow(/node "nope" not found/);
  });

  it('rejects when a custom validator returns allowed: false', () => {
    const state = makeState();
    const block: MoveValidator<Row> = () => ({
      allowed: false,
      reason: 'no indenting today',
    });
    const cmd = new IndentNodeCommand<Row>({ id: 'b', validators: [block] });
    expect(() => cmd.execute(state)).toThrow(MoveRejectedError);
    // State untouched.
    expect(state.nodes.get('root1')!.childIds).toEqual(['a', 'b', 'c']);
  });
});

describe('IndentNodeCommand — undo', () => {
  it('restores the original parent and index', () => {
    const state = makeState();
    const cmd = new IndentNodeCommand<Row>({ id: 'b' });
    const next = cmd.execute(state);
    const undone = cmd.undo(next);
    expect(undone.nodes.get('root1')!.childIds).toEqual(['a', 'b', 'c']);
    expect(undone.nodes.get('a')!.childIds).toEqual(['a1']);
    expect(undone.nodes.get('b')!.parentId).toBe('root1');
  });

  it('restores root order after indenting a root', () => {
    const state = makeState();
    const cmd = new IndentNodeCommand<Row>({ id: 'root2' });
    const next = cmd.execute(state);
    const undone = cmd.undo(next);
    expect(undone.rootIds).toEqual(['root1', 'root2', 'root3']);
    expect(undone.nodes.get('root1')!.childIds).toEqual(['a', 'b', 'c']);
    expect(undone.nodes.get('root2')!.parentId).toBeNull();
  });

  it('undo of a no-op is also a no-op', () => {
    const state = makeState();
    const cmd = new IndentNodeCommand<Row>({ id: 'a' });
    const next = cmd.execute(state);
    const undone = cmd.undo(next);
    expect(undone).toBe(next);
  });
});
