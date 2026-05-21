import { render, screen } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

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

describe('DataGrid — rows and cells', () => {
  it('renders a grid container', () => {
    render(<DataGrid data={data} columns={columns} />);
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('renders one gridcell per row per column', () => {
    render(<DataGrid data={data} columns={columns} />);
    expect(screen.getAllByRole('gridcell')).toHaveLength(4);
  });

  it('renders each cell value', () => {
    render(<DataGrid data={data} columns={columns} />);
    expect(screen.getByText('Bolt')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Nut')).toBeInTheDocument();
  });

  it('uses a custom cell renderer when provided', () => {
    const withRenderer: ColumnDef<Material>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: 'name',
        cell: ({ value }) => <strong>{`* ${String(value)}`}</strong>,
      },
    ];
    render(<DataGrid data={data} columns={withRenderer} />);
    expect(screen.getByText('* Bolt')).toBeInTheDocument();
  });
});
