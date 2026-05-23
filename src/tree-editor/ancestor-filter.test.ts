import { describe, it, expect } from 'vitest';
import { filterToTopLevelNodes } from './ancestor-filter';
import { buildTreeState } from './build-tree-state';

interface Row {
  id: string;
  parentId: string | null;
  name: string;
}

function fixture() {
  return buildTreeState<Row>(
    [
      { id: 'a', parentId: null, name: 'A' },
      { id: 'a1', parentId: 'a', name: 'A1' },
      { id: 'a1a', parentId: 'a1', name: 'A1A' },
      { id: 'a2', parentId: 'a', name: 'A2' },
      { id: 'b', parentId: null, name: 'B' },
    ],
    { getRowId: (r) => r.id, getParentId: (r) => r.parentId },
  );
}

describe('filterToTopLevelNodes', () => {
  it('drops a child when its parent is also selected', () => {
    expect(filterToTopLevelNodes(fixture(), ['a', 'a1'])).toEqual(['a']);
  });

  it('drops a grandchild when its grandparent is selected', () => {
    expect(filterToTopLevelNodes(fixture(), ['a', 'a1a'])).toEqual(['a']);
  });

  it('keeps siblings under the same parent', () => {
    expect(filterToTopLevelNodes(fixture(), ['a1', 'a2'])).toEqual([
      'a1',
      'a2',
    ]);
  });

  it('keeps unrelated subtree roots', () => {
    expect(filterToTopLevelNodes(fixture(), ['a', 'b'])).toEqual(['a', 'b']);
  });

  it('preserves input order', () => {
    expect(filterToTopLevelNodes(fixture(), ['a1', 'a', 'a2'])).toEqual(['a']);
  });

  it('returns empty for empty input', () => {
    expect(filterToTopLevelNodes(fixture(), [])).toEqual([]);
  });

  it('keeps unknown ids as-is', () => {
    expect(filterToTopLevelNodes(fixture(), ['missing', 'a'])).toEqual([
      'missing',
      'a',
    ]);
  });
});
