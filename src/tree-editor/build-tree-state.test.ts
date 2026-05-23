import { describe, it, expect } from 'vitest';
import { buildTreeState } from './build-tree-state';

interface Row {
  id: string;
  parentId?: string | null;
  children?: Row[];
}

describe('buildTreeState — nested input (getChildren)', () => {
  it('builds nodes and rootIds for nested data', () => {
    const data: Row[] = [
      {
        id: 'a',
        children: [
          { id: 'a1' },
          { id: 'a2', children: [{ id: 'a2a' }] },
        ],
      },
      { id: 'b' },
    ];

    const state = buildTreeState(data, {
      getRowId: (r) => r.id,
      getChildren: (r) => r.children,
    });

    expect(state.rootIds).toEqual(['a', 'b']);
    expect(state.nodes.size).toBe(5);

    expect(state.nodes.get('a')).toMatchObject({
      id: 'a',
      parentId: null,
      childIds: ['a1', 'a2'],
    });
    expect(state.nodes.get('a1')).toMatchObject({
      id: 'a1',
      parentId: 'a',
      childIds: [],
    });
    expect(state.nodes.get('a2')).toMatchObject({
      id: 'a2',
      parentId: 'a',
      childIds: ['a2a'],
    });
    expect(state.nodes.get('a2a')).toMatchObject({
      id: 'a2a',
      parentId: 'a2',
      childIds: [],
    });
    expect(state.nodes.get('b')).toMatchObject({
      id: 'b',
      parentId: null,
      childIds: [],
    });
  });

  it('treats missing children as leaf', () => {
    const data: Row[] = [{ id: 'a' }];
    const state = buildTreeState(data, {
      getRowId: (r) => r.id,
      getChildren: (r) => r.children,
    });
    expect(state.nodes.get('a')!.childIds).toEqual([]);
  });
});

describe('buildTreeState — flat input (getParentId)', () => {
  it('builds nodes and rootIds for flat parent-pointer data', () => {
    const data: Row[] = [
      { id: 'a', parentId: null },
      { id: 'a1', parentId: 'a' },
      { id: 'a2', parentId: 'a' },
      { id: 'b', parentId: null },
    ];
    const state = buildTreeState(data, {
      getRowId: (r) => r.id,
      getParentId: (r) => r.parentId,
    });

    expect(state.rootIds).toEqual(['a', 'b']);
    expect(state.nodes.get('a')!.childIds).toEqual(['a1', 'a2']);
    expect(state.nodes.get('a1')!.parentId).toBe('a');
    expect(state.nodes.get('b')!.childIds).toEqual([]);
  });

  it('promotes orphans to roots', () => {
    const data: Row[] = [
      { id: 'a', parentId: null },
      { id: 'x', parentId: 'missing' },
    ];
    const state = buildTreeState(data, {
      getRowId: (r) => r.id,
      getParentId: (r) => r.parentId,
    });
    expect(state.rootIds).toEqual(['a', 'x']);
    expect(state.nodes.get('x')!.parentId).toBeNull();
  });
});

describe('buildTreeState — edge cases', () => {
  it('returns empty state for empty input', () => {
    const state = buildTreeState<Row>([], {
      getRowId: (r) => r.id,
      getChildren: (r) => r.children,
    });
    expect(state.nodes.size).toBe(0);
    expect(state.rootIds).toEqual([]);
  });

  it('treats every row as root when no accessor is provided', () => {
    const data: Row[] = [{ id: 'a' }, { id: 'b' }];
    const state = buildTreeState(data, { getRowId: (r) => r.id });
    expect(state.rootIds).toEqual(['a', 'b']);
    expect(state.nodes.get('a')!.parentId).toBeNull();
    expect(state.nodes.get('b')!.parentId).toBeNull();
  });

  it('handles a single root with children', () => {
    const data: Row[] = [
      { id: 'root', children: [{ id: 'c1' }, { id: 'c2' }] },
    ];
    const state = buildTreeState(data, {
      getRowId: (r) => r.id,
      getChildren: (r) => r.children,
    });
    expect(state.rootIds).toEqual(['root']);
    expect(state.nodes.get('root')!.childIds).toEqual(['c1', 'c2']);
  });
});
