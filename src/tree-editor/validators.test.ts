import { describe, it, expect } from 'vitest';
import type { TreeNode, TreeState } from './types';
import { isDescendant, validateCycleAndSelf } from './validators';

interface Row { id: string }

function makeNode(
  id: string,
  parentId: string | null,
  childIds: string[] = [],
): TreeNode<Row> {
  return { id, parentId, childIds, data: { id } };
}

/**
 * root1
 *   a
 *     a1
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

describe('isDescendant', () => {
  it('returns true when ids match', () => {
    expect(isDescendant('a', 'a', makeState())).toBe(true);
  });

  it('returns true for a direct child', () => {
    expect(isDescendant('a', 'a1', makeState())).toBe(true);
  });

  it('returns true for a deep descendant', () => {
    expect(isDescendant('root1', 'a1a', makeState())).toBe(true);
  });

  it('returns false for an unrelated node', () => {
    expect(isDescendant('a', 'b', makeState())).toBe(false);
  });

  it('returns false for a different root', () => {
    expect(isDescendant('root1', 'root2', makeState())).toBe(false);
  });

  it('returns false for an ancestor (not descendant)', () => {
    expect(isDescendant('a1', 'a', makeState())).toBe(false);
  });
});

describe('validateCycleAndSelf', () => {
  it('blocks moving a node onto itself', () => {
    const result = validateCycleAndSelf('a', 'a', 'child', makeState());
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toMatch(/itself/i);
  });

  it('blocks moving a node into its own child', () => {
    const result = validateCycleAndSelf('a', 'a1', 'child', makeState());
    expect(result.allowed).toBe(false);
  });

  it('blocks moving a node into its own grandchild', () => {
    const result = validateCycleAndSelf('a', 'a1a', 'child', makeState());
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toMatch(/descendant/i);
  });

  it('allows moving a node to an unrelated node', () => {
    const result = validateCycleAndSelf('a', 'root2', 'child', makeState());
    expect(result.allowed).toBe(true);
  });

  it('allows moving a root to another root as a child', () => {
    const result = validateCycleAndSelf('root1', 'root2', 'child', makeState());
    expect(result.allowed).toBe(true);
  });

  it('allows move to root (targetId null)', () => {
    const result = validateCycleAndSelf('a', null, 'child', makeState());
    expect(result.allowed).toBe(true);
  });

  it('honors position parameter (ignored, all positions blocked when self)', () => {
    expect(
      validateCycleAndSelf('a', 'a', 'before', makeState()).allowed,
    ).toBe(false);
    expect(
      validateCycleAndSelf('a', 'a', 'after', makeState()).allowed,
    ).toBe(false);
  });
});
