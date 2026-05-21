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

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

const treeRows: TreeNode[] = [
  {
    id: 'a',
    name: 'A',
    children: [
      { id: 'a1', name: 'A1' },
      { id: 'a2', name: 'A2' },
    ],
  },
];

const treeColumns: ColumnDef<TreeNode>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
];

describe('useGridTable — tree mode', () => {
  it('shows only root rows when collapsed', () => {
    const { result } = renderHook(() =>
      useGridTable({
        data: treeRows,
        columns: treeColumns,
        getSubRows: (row) => row.children,
        getRowId: (row) => row.id,
      }),
    );
    expect(result.current.getRowModel().rows).toHaveLength(1);
  });

  it('marks a row with children as expandable', () => {
    const { result } = renderHook(() =>
      useGridTable({
        data: treeRows,
        columns: treeColumns,
        getSubRows: (row) => row.children,
        getRowId: (row) => row.id,
      }),
    );
    expect(result.current.getRowModel().rows[0].getCanExpand()).toBe(true);
  });

  it('includes descendant rows when defaultExpanded is set', () => {
    const { result } = renderHook(() =>
      useGridTable({
        data: treeRows,
        columns: treeColumns,
        getSubRows: (row) => row.children,
        getRowId: (row) => row.id,
        defaultExpanded: true,
      }),
    );
    // 1 root + 2 children
    expect(result.current.getRowModel().rows).toHaveLength(3);
  });
});

describe('useGridTable — sorting', () => {
  it('sorts rows ascending by a column when defaultSort is provided', () => {
    const unsorted: Material[] = [
      { id: 'M-2', name: 'Nut', qty: 8 },
      { id: 'M-1', name: 'Bolt', qty: 12 },
    ];
    const { result } = renderHook(() =>
      useGridTable({
        data: unsorted,
        columns,
        defaultSort: [{ columnId: 'name', direction: 'asc' }],
      }),
    );
    const names = result.current
      .getRowModel()
      .rows.map((r) => r.getValue('name'));
    expect(names).toEqual(['Bolt', 'Nut']);
  });

  it('sorts rows descending when direction is desc', () => {
    const { result } = renderHook(() =>
      useGridTable({
        data,
        columns,
        defaultSort: [{ columnId: 'name', direction: 'desc' }],
      }),
    );
    const names = result.current
      .getRowModel()
      .rows.map((r) => r.getValue('name'));
    expect(names).toEqual(['Nut', 'Bolt']);
  });

  it('disables sorting on a column with sortable: false', () => {
    const cols: ColumnDef<Material>[] = [
      { id: 'name', header: 'Name', accessor: 'name', sortable: false },
      { id: 'qty', header: 'Qty', accessor: 'qty' },
    ];
    const { result } = renderHook(() =>
      useGridTable({ data, columns: cols }),
    );
    const nameCol = result.current.getColumn('name');
    expect(nameCol?.getCanSort()).toBe(false);
  });
});

describe('useGridTable — column pinning', () => {
  it('pins columns to the left when pin is set', () => {
    const cols: ColumnDef<Material>[] = [
      { id: 'name', header: 'Name', accessor: 'name', pin: 'left' },
      { id: 'qty', header: 'Qty', accessor: 'qty' },
    ];
    const { result } = renderHook(() => useGridTable({ data, columns: cols }));
    const pinState = result.current.getState().columnPinning;
    expect(pinState.left).toContain('name');
  });

  it('pins columns to the right when pin is set', () => {
    const cols: ColumnDef<Material>[] = [
      { id: 'name', header: 'Name', accessor: 'name' },
      { id: 'qty', header: 'Qty', accessor: 'qty', pin: 'right' },
    ];
    const { result } = renderHook(() => useGridTable({ data, columns: cols }));
    const pinState = result.current.getState().columnPinning;
    expect(pinState.right).toContain('qty');
  });

  it('leaves unpinned columns in the center', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    const pinState = result.current.getState().columnPinning;
    expect(pinState.left).toEqual([]);
    expect(pinState.right).toEqual([]);
  });
});
