import { resolveTreeColumnId } from './resolve-tree-column-id';
import type { ColumnDef } from './types';

interface Row {
  a: string;
  b: string;
}

describe('resolveTreeColumnId', () => {
  it('returns the id of the column flagged isTreeColumn', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'A' },
      { id: 'b', header: 'B', isTreeColumn: true },
    ];
    expect(resolveTreeColumnId(columns)).toBe('b');
  });

  it('falls back to the first column and warns when none is flagged', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'A' },
      { id: 'b', header: 'B' },
    ];
    expect(resolveTreeColumnId(columns)).toBe('a');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
