import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const catalog: Product[] = [
  ...products,
  { id: '5', name: 'Speaker', category: 'Electronics', subcategory: 'Audio', price: 199 },
  { id: '6', name: 'Standing Desk', category: 'Furniture', subcategory: 'Desks', price: 699 },
  { id: '7', name: 'Monitor Arm', category: 'Furniture', subcategory: 'Accessories', price: 89 },
];

describe('DataGrid — row grouping', () => {
  it('renders group rows with values and leaf counts', async () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category']}
        defaultExpanded
      />,
    );

    await screen.findByText('Laptop Pro');

    expect(container.querySelectorAll('.strata-group-row')).toHaveLength(2);
    expect([...container.querySelectorAll('.strata-group-label')]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ textContent: 'Electronics' }),
        expect.objectContaining({ textContent: 'Furniture' }),
      ]),
    );
    expect(screen.getByText('(3)')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });

  it('starts collapsed unless defaultExpanded is set', async () => {
    const { container } = render(
      <DataGrid data={products} columns={columns} groupBy={['category']} />,
    );

    await waitFor(() => {
      expect(container.querySelectorAll('.strata-group-row')).toHaveLength(2);
    });
    expect(screen.queryByText('Laptop Pro')).not.toBeInTheDocument();
    expect(screen.queryByText('Desk Chair')).not.toBeInTheDocument();
  });

  it('toggles a group open and closed', async () => {
    render(
      <DataGrid data={products} columns={columns} groupBy={['category']} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Expand Electronics' }));
    expect(await screen.findByText('Laptop Pro')).toBeInTheDocument();
    expect(screen.getByText('Headphones')).toBeInTheDocument();
    expect(screen.queryByText('Desk Chair')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Collapse Electronics' }));
    await waitFor(() => {
      expect(screen.queryByText('Laptop Pro')).not.toBeInTheDocument();
    });
  });

  it('supports nested grouping by multiple columns', async () => {
    const { container } = render(
      <DataGrid
        data={catalog}
        columns={columns}
        groupBy={['category', 'subcategory']}
        defaultExpanded
      />,
    );

    await screen.findByText('Laptop Pro');

    const labels = [...container.querySelectorAll('.strata-group-label')].map(
      (label) => label.textContent,
    );
    expect(container.querySelectorAll('.strata-group-row')).toHaveLength(7);
    const topGroups = container.querySelectorAll('.strata-group-row-depth-0');
    expect(topGroups).toHaveLength(2);
    expect(container.querySelectorAll('.strata-group-row-depth-1')).toHaveLength(5);
    expect(topGroups[0]).toHaveTextContent('Electronics');
    expect(topGroups[0]).toHaveTextContent('(4)');
    expect(topGroups[1]).toHaveTextContent('Furniture');
    expect(topGroups[1]).toHaveTextContent('(3)');
    expect(labels).toContain('Computers');
    expect(labels).toContain('Audio');
    expect(labels).toContain('Desks');
    expect(labels).toContain('Accessories');
  });

  it('exposes row and expansion aria on group rows', async () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category', 'subcategory']}
        defaultExpanded
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('.strata-group-row-depth-0')).toBeInTheDocument();
    });

    const topGroup = container.querySelector('.strata-group-row-depth-0');
    const nestedGroup = container.querySelector('.strata-group-row-depth-1');
    expect(topGroup).toHaveAttribute('role', 'row');
    expect(topGroup).toHaveAttribute('aria-expanded', 'true');
    expect(topGroup).toHaveAttribute('aria-level', '1');
    expect(nestedGroup).toHaveAttribute('aria-level', '2');
  });
});

describe('DataGrid — row grouping pipeline behavior', () => {
  it('sorts rows inside each group', async () => {
    const { container } = render(
      <DataGrid
        data={catalog}
        columns={columns}
        groupBy={['category']}
        defaultExpanded
        defaultSort={[{ columnId: 'price', direction: 'asc' }]}
      />,
    );

    await screen.findByText('Speaker');

    const text = container.textContent ?? '';
    expect(text.indexOf('Speaker')).toBeLessThan(text.indexOf('Headphones'));
    expect(text.indexOf('Headphones')).toBeLessThan(text.indexOf('Laptop Air'));
    expect(text.indexOf('Laptop Air')).toBeLessThan(text.indexOf('Laptop Pro'));
    expect(text.indexOf('Monitor Arm')).toBeLessThan(text.indexOf('Desk Chair'));
    expect(text.indexOf('Desk Chair')).toBeLessThan(text.indexOf('Standing Desk'));
  });

  it('filters before grouping so group counts reflect visible leaf rows', async () => {
    const { container } = render(
      <DataGrid
        data={catalog}
        columns={columns}
        groupBy={['category']}
        defaultExpanded
      />,
    );

    fireEvent.click(screen.getByLabelText('Filter name'));
    fireEvent.change(screen.getByLabelText('Filter value for name'), {
      target: { value: 'Laptop' },
    });

    await waitFor(() => {
      expect(container.querySelectorAll('.strata-group-row')).toHaveLength(1);
    });
    expect(container.querySelector('.strata-group-label')).toHaveTextContent(
      'Electronics',
    );
    expect(screen.getByText('(2)')).toBeInTheDocument();
    expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
    expect(screen.getByText('Laptop Air')).toBeInTheDocument();
    expect(screen.queryByText('Headphones')).not.toBeInTheDocument();
    expect(screen.queryByText('Furniture')).not.toBeInTheDocument();
  });

  it('labels empty group values consistently', async () => {
    const rows: Product[] = [
      { id: 'empty', name: 'Unassigned', category: '', subcategory: '', price: 10 },
      { id: 'filled', name: 'Assigned', category: 'Hardware', subcategory: 'Tools', price: 20 },
    ];
    render(
      <DataGrid
        data={rows}
        columns={columns}
        groupBy={['category']}
        defaultExpanded
      />,
    );

    expect(await screen.findByText('(empty)')).toBeInTheDocument();
    const labels = [...document.querySelectorAll('.strata-group-label')].map(
      (label) => label.textContent,
    );
    expect(labels).toContain('Hardware');
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
