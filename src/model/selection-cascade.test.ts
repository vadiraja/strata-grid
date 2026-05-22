import { cascadeSelect, computeIndeterminate } from './selection-cascade';

const tree: Record<string, string[]> = {
  root: ['A', 'B'],
  A: ['A1', 'A2'],
  B: ['B1', 'B2'],
  B1: ['B1a', 'B1b'],
};

const parentMap: Record<string, string | null> = {
  root: null,
  A: 'root',
  A1: 'A',
  A2: 'A',
  B: 'root',
  B1: 'B',
  B1a: 'B1',
  B1b: 'B1',
  B2: 'B',
};

const getSubRowIds = (id: string): string[] => tree[id] ?? [];
const getParentId = (id: string): string | null => parentMap[id] ?? null;

describe('cascadeSelect', () => {
  it('selects a parent and all descendants', () => {
    const result = cascadeSelect('A', true, new Set(), getSubRowIds, getParentId);
    expect(result).toEqual(new Set(['A', 'A1', 'A2']));
  });

  it('deselects a parent and all descendants', () => {
    const initial = new Set(['A', 'A1', 'A2']);
    const result = cascadeSelect('A', false, initial, getSubRowIds, getParentId);
    expect(result).toEqual(new Set());
  });

  it('auto-selects a parent when all siblings become selected', () => {
    const initial = new Set(['A1']);
    const result = cascadeSelect('A2', true, initial, getSubRowIds, getParentId);
    expect(result).toEqual(new Set(['A', 'A1', 'A2']));
  });

  it('deselects ancestors when one child is deselected', () => {
    const initial = new Set(['root', 'A', 'A1', 'A2', 'B']);
    const result = cascadeSelect('A1', false, initial, getSubRowIds, getParentId);
    expect(result.has('root')).toBe(false);
    expect(result.has('A')).toBe(false);
    expect(result.has('A1')).toBe(false);
    expect(result.has('A2')).toBe(true);
  });

  it('works with deeply nested trees', () => {
    const result = cascadeSelect('B', true, new Set(), getSubRowIds, getParentId);
    expect(result).toEqual(new Set(['B', 'B1', 'B1a', 'B1b', 'B2']));
  });
});

describe('computeIndeterminate', () => {
  it('returns empty set when nothing is selected', () => {
    const result = computeIndeterminate(new Set(), getSubRowIds, getParentId);
    expect(result.size).toBe(0);
  });

  it('returns empty set when a parent and all descendants are selected', () => {
    const selected = new Set(['A', 'A1', 'A2']);
    const result = computeIndeterminate(selected, getSubRowIds, getParentId);
    expect(result.has('A')).toBe(false);
  });

  it('marks parent as indeterminate when only some children are selected', () => {
    const selected = new Set(['A1']);
    const result = computeIndeterminate(selected, getSubRowIds, getParentId);
    expect(result.has('A')).toBe(true);
  });

  it('marks multiple ancestor levels as indeterminate', () => {
    const selected = new Set(['B1a']);
    const result = computeIndeterminate(selected, getSubRowIds, getParentId);
    expect(result.has('B1')).toBe(true);
    expect(result.has('B')).toBe(true);
  });

  it('does not mark leaf nodes as indeterminate', () => {
    const selected = new Set(['A1']);
    const result = computeIndeterminate(selected, getSubRowIds, getParentId);
    expect(result.has('A1')).toBe(false);
  });
});
