import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Item {
  id: string;
  name: string;
  qty: number;
}

const items: Item[] = [
  { id: '1', name: 'Cherry', qty: 5 },
  { id: '2', name: 'Apple', qty: 12 },
  { id: '3', name: 'Banana', qty: 8 },
];

const columns: ColumnDef<Item>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'qty', header: 'Qty', accessor: 'qty' },
];

function getVisibleNames(): string[] {
  return screen
    .getAllByRole('gridcell')
    .filter((cell) => cell.textContent && !cell.textContent.match(/^\d+$/))
    .map((cell) => cell.textContent!);
}

describe('DataGrid — sorting', () => {
  it('renders unsorted by default', () => {
    render(<DataGrid data={items} columns={columns} />);
    expect(getVisibleNames()).toEqual(['Cherry', 'Apple', 'Banana']);
  });

  it('sorts ascending on first header click', () => {
    render(<DataGrid data={items} columns={columns} />);
    fireEvent.click(screen.getByText('Name'));
    expect(getVisibleNames()).toEqual(['Apple', 'Banana', 'Cherry']);
  });

  it('sorts descending on second header click', () => {
    render(<DataGrid data={items} columns={columns} />);
    fireEvent.click(screen.getByText('Name'));
    fireEvent.click(screen.getByText('Name'));
    expect(getVisibleNames()).toEqual(['Cherry', 'Banana', 'Apple']);
  });

  it('removes sort on third header click', () => {
    render(<DataGrid data={items} columns={columns} />);
    fireEvent.click(screen.getByText('Name'));
    fireEvent.click(screen.getByText('Name'));
    fireEvent.click(screen.getByText('Name'));
    expect(getVisibleNames()).toEqual(['Cherry', 'Apple', 'Banana']);
  });

  it('applies defaultSort on initial render', () => {
    render(
      <DataGrid
        data={items}
        columns={columns}
        defaultSort={[{ columnId: 'name', direction: 'asc' }]}
      />,
    );
    expect(getVisibleNames()).toEqual(['Apple', 'Banana', 'Cherry']);
  });

  it('sets aria-sort on the sorted column header', () => {
    render(
      <DataGrid
        data={items}
        columns={columns}
        defaultSort={[{ columnId: 'name', direction: 'asc' }]}
      />,
    );
    const header = screen.getByRole('columnheader', { name: /Name/ });
    expect(header).toHaveAttribute('aria-sort', 'ascending');
  });

  it('does not sort a column with sortable: false', () => {
    const cols: ColumnDef<Item>[] = [
      { id: 'name', header: 'Name', accessor: 'name', sortable: false },
      { id: 'qty', header: 'Qty', accessor: 'qty' },
    ];
    render(<DataGrid data={items} columns={cols} />);
    fireEvent.click(screen.getByText('Name'));
    // Order unchanged — sorting disabled
    expect(getVisibleNames()).toEqual(['Cherry', 'Apple', 'Banana']);
  });
});

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

const treeData: TreeNode[] = [
  {
    id: 'B',
    name: 'B-Assembly',
    children: [
      { id: 'B2', name: 'B2-Part' },
      { id: 'B1', name: 'B1-Part' },
    ],
  },
  {
    id: 'A',
    name: 'A-Assembly',
    children: [
      { id: 'A2', name: 'A2-Part' },
      { id: 'A1', name: 'A1-Part' },
    ],
  },
];

const treeCols: ColumnDef<TreeNode>[] = [
  { id: 'name', header: 'Name', accessor: 'name', isTreeColumn: true },
];

describe('DataGrid — tree-aware sorting', () => {
  it('sorts root siblings without moving children above parents', () => {
    render(
      <DataGrid
        data={treeData}
        columns={treeCols}
        treeData={{ getRowId: (r) => r.id, getChildren: (r) => r.children }}
        defaultExpanded
        defaultSort={[{ columnId: 'name', direction: 'asc' }]}
      />,
    );
    // Read the tree-column label, not raw cell text — the cell also
    // contains the decorative expand/collapse toggle glyph.
    const names = screen
      .getAllByRole('gridcell')
      .map((c) => c.querySelector('.strata-tree-label')?.textContent);
    // A-Assembly comes first (sorted), then its children sorted
    expect(names).toEqual([
      'A-Assembly',
      'A1-Part',
      'A2-Part',
      'B-Assembly',
      'B1-Part',
      'B2-Part',
    ]);
  });
});
