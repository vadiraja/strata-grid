import { normalizeTreeData } from './normalize-tree-data';

interface Nested {
  id: string;
  name: string;
  children?: Nested[];
}

interface Flat {
  id: string;
  name: string;
  parentId: string | null;
}

describe('normalizeTreeData — nested data', () => {
  it('uses getChildren directly as getSubRows', () => {
    const rows: Nested[] = [
      { id: 'a', name: 'A', children: [{ id: 'a1', name: 'A1' }] },
    ];
    const result = normalizeTreeData(rows, {
      getRowId: (r) => r.id,
      getChildren: (r) => r.children,
    });
    expect(result.rootRows).toBe(rows);
    expect(result.getSubRows(rows[0])).toEqual([{ id: 'a1', name: 'A1' }]);
  });

  it('warns and prefers getChildren when both accessors are given', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rows: Nested[] = [{ id: 'a', name: 'A' }];
    const result = normalizeTreeData(rows, {
      getRowId: (r) => r.id,
      getChildren: (r) => r.children,
      getParentId: () => null,
    });
    expect(result.rootRows).toBe(rows);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('warns and treats every row as a root when neither accessor is given', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rows: Nested[] = [{ id: 'a', name: 'A' }];
    const result = normalizeTreeData(rows, { getRowId: (r) => r.id });
    expect(result.rootRows).toBe(rows);
    expect(result.getSubRows(rows[0])).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('normalizeTreeData — flat data', () => {
  function build(rows: Flat[]) {
    return normalizeTreeData(rows, {
      getRowId: (r) => r.id,
      getParentId: (r) => r.parentId,
    });
  }

  it('assembles parent-pointer rows into roots and children', () => {
    const rows: Flat[] = [
      { id: 'root', name: 'Root', parentId: null },
      { id: 'c1', name: 'Child 1', parentId: 'root' },
      { id: 'c2', name: 'Child 2', parentId: 'root' },
    ];
    const result = build(rows);
    expect(result.rootRows.map((r) => r.id)).toEqual(['root']);
    expect(result.getSubRows(rows[0])?.map((r) => r.id)).toEqual(['c1', 'c2']);
  });

  it('returns undefined subrows for a leaf', () => {
    const rows: Flat[] = [{ id: 'root', name: 'Root', parentId: null }];
    const result = build(rows);
    expect(result.getSubRows(rows[0])).toBeUndefined();
  });

  it('preserves input order among roots', () => {
    const rows: Flat[] = [
      { id: 'r2', name: 'R2', parentId: null },
      { id: 'r1', name: 'R1', parentId: null },
    ];
    const result = build(rows);
    expect(result.rootRows.map((r) => r.id)).toEqual(['r2', 'r1']);
  });

  it('promotes orphan rows to roots and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rows: Flat[] = [
      { id: 'root', name: 'Root', parentId: null },
      { id: 'lost', name: 'Lost', parentId: 'missing' },
    ];
    const result = build(rows);
    expect(result.rootRows.map((r) => r.id)).toEqual(['root', 'lost']);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('keeps the last row when ids are duplicated and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rows: Flat[] = [
      { id: 'dup', name: 'First', parentId: null },
      { id: 'dup', name: 'Second', parentId: null },
    ];
    const result = build(rows);
    expect(result.rootRows).toHaveLength(1);
    expect(result.rootRows[0].name).toBe('Second');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('breaks cycles instead of looping forever', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rows: Flat[] = [
      { id: 'x', name: 'X', parentId: 'y' },
      { id: 'y', name: 'Y', parentId: 'x' },
    ];
    const result = build(rows);
    expect(result.rootRows.length).toBeGreaterThan(0);
    const seen = new Set<string>();
    const collect = (list: Flat[]): void => {
      for (const row of list) {
        seen.add(row.id);
        const kids = result.getSubRows(row);
        if (kids) collect(kids);
      }
    };
    collect(result.rootRows);
    expect(seen).toEqual(new Set(['x', 'y']));
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('handles a self-referencing row', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rows: Flat[] = [{ id: 's', name: 'Self', parentId: 's' }];
    const result = build(rows);
    expect(result.rootRows.map((r) => r.id)).toEqual(['s']);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
