import { describe, it, expect } from 'vitest';
import type { MoveValidator, TreeNode, TreeState } from '../types';
import { MoveNodeCommand, MoveRejectedError } from './move-node';

interface Row { id: string }

function makeNode(
  id: string,
  parentId: string | null,
  childIds: string[] = [],
): TreeNode<Row> {
  return { id, parentId, childIds, data: { id } };
}

/**
 * root1 -> [a, b]
 *   a -> [a1, a2]
 *     a1 -> [a1a]
 *       a1a
 *     a2
 *   b
 * root2
 */
function makeState(): TreeState<Row> {
  const nodes = new Map<string, TreeNode<Row>>();
  nodes.set('root1', makeNode('root1', null, ['a', 'b']));
  nodes.set('a', makeNode('a', 'root1', ['a1', 'a2']));
  nodes.set('a1', makeNode('a1', 'a', ['a1a']));
  nodes.set('a1a', makeNode('a1a', 'a1'));
  nodes.set('a2', makeNode('a2', 'a'));
  nodes.set('b', makeNode('b', 'root1'));
  nodes.set('root2', makeNode('root2', null));
  return { nodes, rootIds: ['root1', 'root2'] };
}

describe('MoveNodeCommand — execute', () => {
  it('moves a leaf from one parent to another', () => {
    const state = makeState();
    const cmd = new MoveNodeCommand<Row>({ id: 'a2', newParentId: 'b' });
    const next = cmd.execute(state);
    expect(next.nodes.get('a')!.childIds).toEqual(['a1']);
    expect(next.nodes.get('b')!.childIds).toEqual(['a2']);
    expect(next.nodes.get('a2')!.parentId).toBe('b');
  });

  it('moves a node with children — the subtree follows', () => {
    const state = makeState();
    const cmd = new MoveNodeCommand<Row>({ id: 'a1', newParentId: 'root2' });
    const next = cmd.execute(state);
    expect(next.nodes.get('a')!.childIds).toEqual(['a2']);
    expect(next.nodes.get('root2')!.childIds).toEqual(['a1']);
    expect(next.nodes.get('a1')!.parentId).toBe('root2');
    // Children of a1 are unchanged.
    expect(next.nodes.get('a1')!.childIds).toEqual(['a1a']);
    expect(next.nodes.get('a1a')!.parentId).toBe('a1');
  });

  it('moves a child to root (newParentId = null)', () => {
    const state = makeState();
    const cmd = new MoveNodeCommand<Row>({ id: 'a', newParentId: null });
    const next = cmd.execute(state);
    expect(next.nodes.get('root1')!.childIds).toEqual(['b']);
    expect(next.nodes.get('a')!.parentId).toBeNull();
    expect(next.rootIds).toEqual(['root1', 'root2', 'a']);
  });

  it('moves a root to become a child of another root', () => {
    const state = makeState();
    const cmd = new MoveNodeCommand<Row>({ id: 'root2', newParentId: 'root1' });
    const next = cmd.execute(state);
    expect(next.rootIds).toEqual(['root1']);
    expect(next.nodes.get('root1')!.childIds).toEqual(['a', 'b', 'root2']);
    expect(next.nodes.get('root2')!.parentId).toBe('root1');
  });

  it('inserts at a specific index in the new parent', () => {
    const state = makeState();
    const cmd = new MoveNodeCommand<Row>({
      id: 'a2',
      newParentId: 'root1',
      index: 1,
    });
    const next = cmd.execute(state);
    expect(next.nodes.get('root1')!.childIds).toEqual(['a', 'a2', 'b']);
  });

  it('inserts at a specific root index when moving to root', () => {
    const state = makeState();
    const cmd = new MoveNodeCommand<Row>({
      id: 'a',
      newParentId: null,
      index: 0,
    });
    const next = cmd.execute(state);
    expect(next.rootIds).toEqual(['a', 'root1', 'root2']);
  });

  it('clamps out-of-range index to append', () => {
    const state = makeState();
    const cmd = new MoveNodeCommand<Row>({
      id: 'a2',
      newParentId: 'root1',
      index: 99,
    });
    const next = cmd.execute(state);
    expect(next.nodes.get('root1')!.childIds).toEqual(['a', 'b', 'a2']);
  });

  it('does not mutate the input state', () => {
    const state = makeState();
    const beforeAChildIds = state.nodes.get('a')!.childIds;
    const cmd = new MoveNodeCommand<Row>({ id: 'a2', newParentId: 'b' });
    cmd.execute(state);
    expect(state.nodes.get('a')!.childIds).toBe(beforeAChildIds);
    expect(state.nodes.get('a2')!.parentId).toBe('a');
  });

  it('throws when the node does not exist', () => {
    const state = makeState();
    const cmd = new MoveNodeCommand<Row>({ id: 'nope', newParentId: 'b' });
    expect(() => cmd.execute(state)).toThrow(/node "nope" not found/);
  });

  it('throws when the new parent does not exist', () => {
    const state = makeState();
    const cmd = new MoveNodeCommand<Row>({ id: 'a2', newParentId: 'nope' });
    expect(() => cmd.execute(state)).toThrow(/new parent "nope" not found/);
  });
});

describe('MoveNodeCommand — validators', () => {
  it('rejects a self-move via the built-in validator', () => {
    const state = makeState();
    const cmd = new MoveNodeCommand<Row>({ id: 'a', newParentId: 'a' });
    expect(() => cmd.execute(state)).toThrow(MoveRejectedError);
  });

  it('rejects moving a node into its own descendant (cycle)', () => {
    const state = makeState();
    const cmd = new MoveNodeCommand<Row>({ id: 'a', newParentId: 'a1a' });
    expect(() => cmd.execute(state)).toThrow(/descendant/i);
  });

  it('rejects when a custom validator returns allowed: false', () => {
    const state = makeState();
    const block: MoveValidator<Row> = () => ({
      allowed: false,
      reason: 'custom block',
    });
    const cmd = new MoveNodeCommand<Row>({
      id: 'a2',
      newParentId: 'b',
      validators: [block],
    });
    expect(() => cmd.execute(state)).toThrow(/custom block/);
  });

  it('runs custom validators only after the built-in check passes', () => {
    const state = makeState();
    let called = false;
    const v: MoveValidator<Row> = () => {
      called = true;
      return { allowed: true };
    };
    // Self-move — built-in should reject before the custom validator runs.
    const cmd = new MoveNodeCommand<Row>({
      id: 'a',
      newParentId: 'a',
      validators: [v],
    });
    expect(() => cmd.execute(state)).toThrow();
    expect(called).toBe(false);
  });

  it('leaves state untouched when a validator rejects', () => {
    const state = makeState();
    const cmd = new MoveNodeCommand<Row>({ id: 'a', newParentId: 'a1' });
    expect(() => cmd.execute(state)).toThrow();
    // Original state unchanged.
    expect(state.nodes.get('a')!.childIds).toEqual(['a1', 'a2']);
    expect(state.nodes.get('a1')!.parentId).toBe('a');
  });
});

describe('MoveNodeCommand — undo', () => {
  it('restores the original parent and index for a child-to-child move', () => {
    const state = makeState();
    const cmd = new MoveNodeCommand<Row>({
      id: 'a2',
      newParentId: 'root1',
      index: 1,
    });
    const next = cmd.execute(state);
    const undone = cmd.undo(next);
    expect(undone.nodes.get('a')!.childIds).toEqual(['a1', 'a2']);
    expect(undone.nodes.get('a2')!.parentId).toBe('a');
    expect(undone.nodes.get('root1')!.childIds).toEqual(['a', 'b']);
  });

  it('restores a child after a move-to-root', () => {
    const state = makeState();
    const cmd = new MoveNodeCommand<Row>({ id: 'a', newParentId: null });
    const next = cmd.execute(state);
    const undone = cmd.undo(next);
    expect(undone.rootIds).toEqual(['root1', 'root2']);
    expect(undone.nodes.get('root1')!.childIds).toEqual(['a', 'b']);
    expect(undone.nodes.get('a')!.parentId).toBe('root1');
  });

  it('restores a root after a root-to-child move', () => {
    const state = makeState();
    const cmd = new MoveNodeCommand<Row>({ id: 'root2', newParentId: 'root1' });
    const next = cmd.execute(state);
    const undone = cmd.undo(next);
    expect(undone.rootIds).toEqual(['root1', 'root2']);
    expect(undone.nodes.get('root1')!.childIds).toEqual(['a', 'b']);
    expect(undone.nodes.get('root2')!.parentId).toBeNull();
  });

  it('restores the original sibling index when moving to the same parent', () => {
    const state = makeState();
    // Move `a` to the end of root1 (currently at index 0).
    const cmd = new MoveNodeCommand<Row>({
      id: 'a',
      newParentId: 'root1',
      index: 2,
    });
    const next = cmd.execute(state);
    expect(next.nodes.get('root1')!.childIds).toEqual(['b', 'a']);
    const undone = cmd.undo(next);
    expect(undone.nodes.get('root1')!.childIds).toEqual(['a', 'b']);
  });
});
