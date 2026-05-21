import { renderHook } from '@testing-library/react';
import { useGridTable } from './use-grid-table';
import type { ColumnDef } from './types';

interface Material {
  id: string;
  name: string;
  qty: number;
}

const data: Material[] = [
  { id: 'M-1', name: 'Bolt', qty: 12 },
  { id: 'M-2', name: 'Nut', qty: 8 },
];

const columns: ColumnDef<Material>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'qty', header: 'Qty', accessor: 'qty' },
];

describe('useGridTable', () => {
  it('builds a table with one row per data item', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    expect(result.current.getRowModel().rows).toHaveLength(2);
  });

  it('builds a table with one column per column def', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    expect(result.current.getAllColumns()).toHaveLength(2);
  });

  it('exposes cell values through the column accessors', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    const firstRow = result.current.getRowModel().rows[0];
    const values = firstRow.getVisibleCells().map((cell) => cell.getValue());
    expect(values).toEqual(['Bolt', 12]);
  });

  it('carries the Strata column on each column meta', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    const meta = result.current.getAllColumns()[0].columnDef.meta;
    expect(meta?.strataColumn.id).toBe('name');
  });

  it('applies the default width to columns without an explicit width', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    expect(result.current.getAllColumns()[0].getSize()).toBe(160);
  });
});
