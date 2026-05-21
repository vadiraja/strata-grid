import { readValue } from './read-value';
import type { ColumnDef } from './types';

interface Material {
  id: string;
  name: string;
  qty: number;
}

const row: Material = { id: 'M-1', name: 'Bolt', qty: 12 };

describe('readValue', () => {
  it('reads via a key accessor', () => {
    const column: ColumnDef<Material> = { id: 'name', header: 'Name', accessor: 'name' };
    expect(readValue(column, row)).toBe('Bolt');
  });

  it('reads via a function accessor', () => {
    const column: ColumnDef<Material> = {
      id: 'label',
      header: 'Label',
      accessor: (r) => `${r.name} (${r.qty})`,
    };
    expect(readValue(column, row)).toBe('Bolt (12)');
  });

  it('falls back to the column id when no accessor is given', () => {
    const column: ColumnDef<Material> = { id: 'qty', header: 'Qty' };
    expect(readValue(column, row)).toBe(12);
  });

  it('returns undefined when the accessor yields nothing', () => {
    const column: ColumnDef<Material> = {
      id: 'missing',
      header: 'Missing',
      accessor: () => undefined,
    };
    expect(readValue(column, row)).toBeUndefined();
  });
});
