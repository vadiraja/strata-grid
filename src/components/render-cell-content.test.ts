import { renderHook } from '@testing-library/react';
import { renderCellContent } from './render-cell-content';
import { useGridTable } from '../model/use-grid-table';
import type { ColumnDef } from '../model/types';

interface Part {
  id: string;
  name: string;
}

const data: Part[] = [{ id: '1', name: 'Bolt' }];

const columns: ColumnDef<Part>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'tag', header: 'Tag', cell: ({ row }) => `${row.name}!` },
];

describe('renderCellContent', () => {
  it('stringifies the accessor value for a plain column', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    const cell = result.current.getRowModel().rows[0].getVisibleCells()[0];
    expect(renderCellContent(cell)).toBe('Bolt');
  });

  it('delegates to a custom cell renderer when present', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    const cell = result.current.getRowModel().rows[0].getVisibleCells()[1];
    expect(renderCellContent(cell)).toBe('Bolt!');
  });
});
