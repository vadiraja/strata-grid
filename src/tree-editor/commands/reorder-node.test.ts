import { describe, it, expect } from 'vitest';
import type { TreeNode, TreeState } from '../types';
import { ReorderNodeCommand } from './reorder-node';

interface Row { id: string }

function makeNode(
  id: string,
  parentId: string | null,
  childIds: string[] = [],
): TreeNode<Row> {
  return { id, parentId, childIds, data: { id } };
}

/**
 * root1 -> [a, b, c]
 * root2
 * root3
 */
function makeState(): TreeState<Row> {
  const nodes = new Map<string, TreeNode<Row>>();
  nodes.set('root1', makeNode('root1', null, ['a', 'b', 'c']));
  nodes.set('a', makeNode('a', 'root1'));
  nodes.set('b', makeNode('b', 'root1'));
  nodes.set('c', makeNode('c', 'root1'));
  nodes.set('root2', makeNode('root2', null));
  nodes.set('root3', makeNode('root3', null));
  return { nodes, rootIds: ['root1', 'root2', 'root3'] };
}

describe('ReorderNodeCommand — execute', () => {
  it('moves a child up — swaps with previous sibling', () => {
    const state = makeState();
    const cmd = new ReorderNodeCommand<Row>({ id: 'b', direction: 'up' });
    const next = cmd.execute(state);
    expect(next.nodes.get('root1')!.childIds).toEqual(['b', 'a', 'c']);
  });

  it('moves a child down — swaps with next sibling', () => {
    const state = makeState();
    const cmd = new ReorderNodeCommand<Row>({ id: 'b', direction: 'down' });
    const next = cmd.execute(state);
    expect(next.nodes.get('root1')!.childIds).toEqual(['a', 'c', 'b']);
  });

  it('is a no-op when moving up at index 0', () => {
    const state = makeState();
    const cmd = new ReorderNodeCommand<Row>({ id: 'a', direction: 'up' });
    const next = cmd.execute(state);
    expect(next).toBe(state);
    expect(next.nodes.get('root1')!.childIds).toEqual(['a', 'b', 'c']);
  });

  it('is a no-op when moving down at the last index', () => {
    const state = makeState();
    const cmd = new ReorderNodeCommand<Row>({ id: 'c', direction: 'down' });
    const next = cmd.execute(state);
    expect(next).toBe(state);
  });

  it('reorders root-level siblings (up)', () => {
    const state = makeState();
    const cmd = new ReorderNodeCommand<Row>({ id: 'root2', direction: 'up' });
    const next = cmd.execute(state);
    expect(next.rootIds).toEqual(['root2', 'root1', 'root3']);
  });

  it('reorders root-level siblings (down)', () => {
    const state = makeState();
    const cmd = new ReorderNodeCommand<Row>({ id: 'root2', direction: 'down' });
    const next = cmd.execute(state);
    expect(next.rootIds).toEqual(['root1', 'root3', 'root2']);
  });

  it('does not mutate the input state', () => {
    const state = makeState();
    const before = state.nodes.get('root1')!.childIds;
    const cmd = new ReorderNodeCommand<Row>({ id: 'b', direction: 'up' });
    cmd.execute(state);
    expect(state.nodes.get('root1')!.childIds).toBe(before);
    expect(state.nodes.get('root1')!.childIds).toEqual(['a', 'b', 'c']);
  });

  it('throws when the node does not exist', () => {
    const state = makeState();
    const cmd = new ReorderNodeCommand<Row>({ id: 'nope', direction: 'up' });
    expect(() => cmd.execute(state)).toThrow(/node "nope" not found/);
  });
});

describe('ReorderNodeCommand — undo', () => {
  it('restores order after a move-up', () => {
    const state = makeState();
    const cmd = new ReorderNodeCommand<Row>({ id: 'b', direction: 'up' });
    const next = cmd.execute(state);
    const undone = cmd.undo(next);
    expect(undone.nodes.get('root1')!.childIds).toEqual(['a', 'b', 'c']);
  });

  it('restores order after a move-down', () => {
    const state = makeState();
    const cmd = new ReorderNodeCommand<Row>({ id: 'b', direction: 'down' });
    const next = cmd.execute(state);
    const undone = cmd.undo(next);
    expect(undone.nodes.get('root1')!.childIds).toEqual(['a', 'b', 'c']);
  });

  it('restores root-level order after reorder', () => {
    const state = makeState();
    const cmd = new ReorderNodeCommand<Row>({ id: 'root2', direction: 'down' });
    const next = cmd.execute(state);
    const undone = cmd.undo(next);
    expect(undone.rootIds).toEqual(['root1', 'root2', 'root3']);
  });

  it('undo of a no-op is also a no-op', () => {
    const state = makeState();
    const cmd = new ReorderNodeCommand<Row>({ id: 'a', direction: 'up' });
    const next = cmd.execute(state);
    const undone = cmd.undo(next);
    expect(undone).toBe(next);
  });
});
