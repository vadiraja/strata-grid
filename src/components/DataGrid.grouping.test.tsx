import { fireEvent, render, screen } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef, TreeDataConfig } from '../model/types';

interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
}

const products: Product[] = [
  { id: '1', name: 'Laptop Pro', category: 'Electronics', subcategory: 'Computers', price: 1299 },
  { id: '2', name: 'Laptop Air', category: 'Electronics', subcategory: 'Computers', price: 999 },
  { id: '3', name: 'Headphones', category: 'Electronics', subcategory: 'Audio', price: 349 },
  { id: '4', name: 'Desk Chair', category: 'Furniture', subcategory: 'Seating', price: 450 },
];

const columns: ColumnDef<Product>[] = [
  { id: 'name', header: 'Name', accessor: 'name', filter: 'text' },
  { id: 'category', header: 'Category', accessor: 'category', filter: 'text' },
  { id: 'subcategory', header: 'Subcategory', accessor: 'subcategory' },
  { id: 'price', header: 'Price', accessor: 'price', sortable: true, filter: 'number' },
];

describe('DataGrid — row grouping', () => {
  it('renders group rows with values and leaf counts', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category']}
        defaultExpanded
      />,
    );

    const labels = [...container.querySelectorAll('.strata-group-label')].map(
      (label) => label.textContent,
    );
    expect(container.querySelectorAll('.strata-group-row')).toHaveLength(2);
    expect(labels).toContain('Electronics');
    expect(labels).toContain('Furniture');
    expect(screen.getByText('(3)')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
    expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
  });

  it('starts collapsed unless defaultExpanded is set', () => {
    const { container } = render(
      <DataGrid data={products} columns={columns} groupBy={['category']} />,
    );

    expect(container.querySelectorAll('.strata-group-row')).toHaveLength(2);
    expect(screen.queryByText('Laptop Pro')).not.toBeInTheDocument();
    expect(screen.queryByText('Desk Chair')).not.toBeInTheDocument();
  });

  it('toggles a group open and closed', () => {
    render(
      <DataGrid data={products} columns={columns} groupBy={['category']} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Expand Electronics' }));
    expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
    expect(screen.getByText('Headphones')).toBeInTheDocument();
    expect(screen.queryByText('Desk Chair')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Collapse Electronics' }));
    expect(screen.queryByText('Laptop Pro')).not.toBeInTheDocument();
  });

  it('supports nested grouping by multiple columns', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category', 'subcategory']}
        defaultExpanded
      />,
    );

    const labels = [...container.querySelectorAll('.strata-group-label')].map(
      (label) => label.textContent,
    );
    expect(container.querySelectorAll('.strata-group-row')).toHaveLength(5);
    const topGroups = container.querySelectorAll('.strata-group-row-depth-0');
    expect(topGroups).toHaveLength(2);
    expect(container.querySelectorAll('.strata-group-row-depth-1')).toHaveLength(3);
    expect(topGroups[0]).toHaveTextContent('Electronics');
    expect(topGroups[0]).toHaveTextContent('(3)');
    expect(topGroups[1]).toHaveTextContent('Furniture');
    expect(topGroups[1]).toHaveTextContent('(1)');
    expect(labels).toContain('Computers');
    expect(labels).toContain('Audio');
  });

  it('exposes row and expansion aria on group rows', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category', 'subcategory']}
        defaultExpanded
      />,
    );

    const topGroup = container.querySelector('.strata-group-row-depth-0');
    const nestedGroup = container.querySelector('.strata-group-row-depth-1');
    expect(topGroup).toHaveAttribute('role', 'row');
    expect(topGroup).toHaveAttribute('aria-expanded', 'true');
    expect(topGroup).toHaveAttribute('aria-level', '1');
    expect(nestedGroup).toHaveAttribute('aria-level', '2');
  });
});

describe('DataGrid — row grouping edge cases', () => {
  it('renders normally when groupBy is empty', () => {
    const { container } = render(
      <DataGrid data={products} columns={columns} groupBy={[]} />,
    );

    expect(container.querySelectorAll('.strata-group-row')).toHaveLength(0);
    expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
  });

  it('lets tree mode win when treeData and groupBy are both provided', () => {
    interface Node {
      id: string;
      name: string;
      children?: Node[];
    }

    const treeRows: Node[] = [
      { id: 'A', name: 'Assembly', children: [{ id: 'B', name: 'Bolt' }] },
    ];
    const treeColumns: ColumnDef<Node>[] = [
      { id: 'name', header: 'Name', accessor: 'name', isTreeColumn: true },
    ];
    const treeData: TreeDataConfig<Node> = {
      getRowId: (row) => row.id,
      getChildren: (row) => row.children,
    };
    const { container } = render(
      <DataGrid
        data={treeRows}
        columns={treeColumns}
        treeData={treeData}
        groupBy={['name']}
        defaultExpanded
      />,
    );

    expect(container.querySelectorAll('.strata-group-row')).toHaveLength(0);
    expect(screen.getByText('Assembly')).toBeInTheDocument();
    expect(screen.getByText('Bolt')).toBeInTheDocument();
  });
});
