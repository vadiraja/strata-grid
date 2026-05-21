import { render, screen } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Material {
  id: string;
  name: string;
  qty: number;
}

const columns: ColumnDef<Material>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
];

describe('DataGrid — footer and empty state', () => {
  it('shows the row count in the footer', () => {
    const data: Material[] = [
      { id: 'M-1', name: 'Bolt', qty: 1 },
      { id: 'M-2', name: 'Nut', qty: 2 },
    ];
    render(<DataGrid data={data} columns={columns} />);
    expect(screen.getByText('2 rows')).toBeInTheDocument();
  });

  it('uses the singular form for a single row', () => {
    render(<DataGrid data={[{ id: 'M-1', name: 'Bolt', qty: 1 }]} columns={columns} />);
    expect(screen.getByText('1 row')).toBeInTheDocument();
  });

  it('shows an empty message when there is no data', () => {
    render(<DataGrid data={[]} columns={columns} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('shows 0 rows in the footer when empty', () => {
    render(<DataGrid data={[]} columns={columns} />);
    expect(screen.getByText('0 rows')).toBeInTheDocument();
  });
});
