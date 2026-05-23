import { render, screen } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
}

const products: Product[] = [
  { id: '1', name: 'Laptop Pro', category: 'Electronics', price: 1299 },
  { id: '2', name: 'Laptop Air', category: 'Electronics', price: 999 },
  { id: '3', name: 'Headphones', category: 'Electronics', price: 349 },
  { id: '4', name: 'Desk Chair', category: 'Furniture', price: 450 },
];

const columns: ColumnDef<Product>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'category', header: 'Category', accessor: 'category' },
  {
    id: 'price',
    header: 'Price',
    accessor: 'price',
    aggregate: 'sum',
    aggregateFormatter: (value) => `$${value}`,
  },
];

describe('DataGrid — aggregation', () => {
  it('shows aggregate values on group rows', () => {
    const { container } = render(
      <DataGrid
        data={products}
        columns={columns}
        groupBy={['category']}
        defaultExpanded
      />,
    );

    const electronicsGroup = [...container.querySelectorAll('.strata-group-row')]
      .find((row) => row.textContent?.includes('Electronics'));
    const furnitureGroup = [...container.querySelectorAll('.strata-group-row')]
      .find((row) => row.textContent?.includes('Furniture'));

    expect(electronicsGroup).toHaveTextContent('Price$2647');
    expect(furnitureGroup).toHaveTextContent('Price$450');
  });

  it('shows footer aggregates when enabled', () => {
    render(
      <DataGrid
        data={products}
        columns={columns}
        aggregation={{ showFooterAggregates: true }}
      />,
    );

    expect(screen.getByText('4 rows')).toBeInTheDocument();
    expect(screen.getByText('$3097')).toBeInTheDocument();
  });

  it('does not show footer aggregates by default', () => {
    render(<DataGrid data={products} columns={columns} />);

    expect(screen.queryByText('$3097')).not.toBeInTheDocument();
  });
});
