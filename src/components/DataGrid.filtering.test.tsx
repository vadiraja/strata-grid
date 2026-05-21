import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Item {
  id: string;
  name: string;
  qty: number;
}

const items: Item[] = [
  { id: '1', name: 'Bolt', qty: 12 },
  { id: '2', name: 'Nut', qty: 8 },
  { id: '3', name: 'Washer', qty: 24 },
];

const columns: ColumnDef<Item>[] = [
  { id: 'name', header: 'Name', accessor: 'name', filter: 'text' },
  { id: 'qty', header: 'Qty', accessor: 'qty', filter: 'number' },
];

describe('DataGrid — filtering', () => {
  it('renders a filter button for columns with a filter type', () => {
    render(<DataGrid data={items} columns={columns} />);
    expect(screen.getByLabelText('Filter name')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter qty')).toBeInTheDocument();
  });

  it('filters rows by text (case-insensitive substring)', () => {
    render(<DataGrid data={items} columns={columns} />);
    fireEvent.click(screen.getByLabelText('Filter name'));
    const input = screen.getByLabelText('Filter value for name');
    fireEvent.change(input, { target: { value: 'bol' } });
    expect(screen.getByText('Bolt')).toBeInTheDocument();
    expect(screen.queryByText('Nut')).not.toBeInTheDocument();
    expect(screen.queryByText('Washer')).not.toBeInTheDocument();
  });

  it('filters rows by number', () => {
    render(<DataGrid data={items} columns={columns} />);
    fireEvent.click(screen.getByLabelText('Filter qty'));
    const input = screen.getByLabelText('Filter value for qty');
    fireEvent.change(input, { target: { value: '24' } });
    expect(screen.getByText('Washer')).toBeInTheDocument();
    expect(screen.queryByText('Bolt')).not.toBeInTheDocument();
  });

  it('shows all rows when filter is cleared', () => {
    render(<DataGrid data={items} columns={columns} />);
    fireEvent.click(screen.getByLabelText('Filter name'));
    const input = screen.getByLabelText('Filter value for name');
    fireEvent.change(input, { target: { value: 'bol' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByText('Bolt')).toBeInTheDocument();
    expect(screen.getByText('Nut')).toBeInTheDocument();
    expect(screen.getByText('Washer')).toBeInTheDocument();
  });

  it('does not render a filter button for columns without filter', () => {
    const cols: ColumnDef<Item>[] = [
      { id: 'name', header: 'Name', accessor: 'name' },
    ];
    render(<DataGrid data={items} columns={cols} />);
    expect(screen.queryByLabelText('Filter name')).not.toBeInTheDocument();
  });
});

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

const treeRows: TreeNode[] = [
  {
    id: 'A',
    name: 'Assembly A',
    children: [
      { id: 'A1', name: 'Matching Part' },
      { id: 'A2', name: 'Other Part' },
    ],
  },
  {
    id: 'B',
    name: 'Assembly B',
    children: [{ id: 'B1', name: 'Unrelated' }],
  },
];

const treeCols: ColumnDef<TreeNode>[] = [
  { id: 'name', header: 'Name', accessor: 'name', isTreeColumn: true, filter: 'text' },
];

describe('DataGrid — tree-aware filtering (ancestor preservation)', () => {
  it('keeps ancestor rows visible when a descendant matches', () => {
    render(
      <DataGrid
        data={treeRows}
        columns={treeCols}
        treeData={{ getRowId: (r) => r.id, getChildren: (r) => r.children }}
        defaultExpanded
      />,
    );
    fireEvent.click(screen.getByLabelText('Filter name'));
    const input = screen.getByLabelText('Filter value for name');
    fireEvent.change(input, { target: { value: 'Matching' } });
    // The matching leaf is visible
    expect(screen.getByText('Matching Part')).toBeInTheDocument();
    // Its ancestor is preserved
    expect(screen.getByText('Assembly A')).toBeInTheDocument();
    // The non-matching sibling is hidden
    expect(screen.queryByText('Other Part')).not.toBeInTheDocument();
    // The entirely non-matching branch is hidden
    expect(screen.queryByText('Assembly B')).not.toBeInTheDocument();
  });

  it('shows all rows when tree filter is cleared', () => {
    render(
      <DataGrid
        data={treeRows}
        columns={treeCols}
        treeData={{ getRowId: (r) => r.id, getChildren: (r) => r.children }}
        defaultExpanded
      />,
    );
    fireEvent.click(screen.getByLabelText('Filter name'));
    const input = screen.getByLabelText('Filter value for name');
    fireEvent.change(input, { target: { value: 'Matching' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByText('Assembly A')).toBeInTheDocument();
    expect(screen.getByText('Assembly B')).toBeInTheDocument();
    expect(screen.getByText('Unrelated')).toBeInTheDocument();
  });
});
