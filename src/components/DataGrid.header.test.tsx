import { render, screen } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Material {
  id: string;
  name: string;
  qty: number;
}

const data: Material[] = [{ id: 'M-1', name: 'Bolt', qty: 12 }];

const columns: ColumnDef<Material>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'qty', header: 'Qty', accessor: 'qty' },
];

describe('DataGrid — column headers', () => {
  it('renders one column header per column', () => {
    render(<DataGrid data={data} columns={columns} />);
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
  });

  it('renders the header text', () => {
    render(<DataGrid data={data} columns={columns} />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Qty' })).toBeInTheDocument();
  });
});
