import { fireEvent, render, screen } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { AnyColumn, ColumnDef, ColumnGroup } from '../model/types';

interface Item {
  id: string;
  material: string;
  description: string;
  qty: number;
  uom: string;
}

const data: Item[] = [
  { id: '1', material: 'B-200', description: 'Bolt', qty: 12, uom: 'EA' },
  { id: '2', material: 'A-100', description: 'Nut', qty: 8, uom: 'EA' },
];

const material: ColumnDef<Item> = {
  id: 'material',
  header: 'Material',
  accessor: 'material',
  filter: 'text',
};
const description: ColumnDef<Item> = {
  id: 'description',
  header: 'Description',
  accessor: 'description',
};
const qty: ColumnDef<Item> = {
  id: 'qty',
  header: 'Qty',
  accessor: 'qty',
  filter: 'number',
};
const uom: ColumnDef<Item> = {
  id: 'uom',
  header: 'UoM',
  accessor: 'uom',
};

describe('DataGrid — column groups', () => {
  it('renders one header row for flat columns', () => {
    const { container } = render(
      <DataGrid data={data} columns={[material, description]} />,
    );

    expect(container.querySelectorAll('.strata-header-row')).toHaveLength(1);
  });

  it('renders grouped columns as stacked headers', () => {
    const columns: AnyColumn<Item>[] = [
      {
        groupId: 'identification',
        header: 'Identification',
        columns: [material, description],
      },
      {
        groupId: 'quantity',
        header: 'Quantity',
        columns: [qty, uom],
      },
    ];
    const { container } = render(<DataGrid data={data} columns={columns} />);

    expect(container.querySelectorAll('.strata-header-row')).toHaveLength(2);
    expect(screen.getByRole('columnheader', { name: 'Identification' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Quantity' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Material/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Qty/ })).toBeInTheDocument();
  });

  it('supports nested column groups', () => {
    const quantityGroup: ColumnGroup<Item> = {
      groupId: 'quantity',
      header: 'Quantity',
      columns: [qty, uom],
    };
    const columns: AnyColumn<Item>[] = [
      {
        groupId: 'details',
        header: 'Details',
        columns: [description, quantityGroup],
      },
    ];
    const { container } = render(<DataGrid data={data} columns={columns} />);

    expect(container.querySelectorAll('.strata-header-row')).toHaveLength(3);
    expect(screen.getByRole('columnheader', { name: 'Details' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Quantity' })).toBeInTheDocument();
  });

  it('keeps leaf sorting working inside groups', () => {
    const columns: AnyColumn<Item>[] = [
      { groupId: 'identification', header: 'Identification', columns: [material, description] },
    ];
    render(<DataGrid data={data} columns={columns} />);

    fireEvent.click(screen.getByRole('columnheader', { name: /Material/ }));
    const cells = screen.getAllByRole('gridcell').map((cell) => cell.textContent);
    expect(cells.indexOf('A-100')).toBeLessThan(cells.indexOf('B-200'));
  });

  it('keeps leaf filtering working inside groups', () => {
    const columns: AnyColumn<Item>[] = [
      { groupId: 'identification', header: 'Identification', columns: [material, description] },
      { groupId: 'quantity', header: 'Quantity', columns: [qty, uom] },
    ];
    render(<DataGrid data={data} columns={columns} />);

    fireEvent.click(screen.getByLabelText('Filter qty'));
    fireEvent.change(screen.getByLabelText('Filter value for qty'), {
      target: { value: '8' },
    });

    expect(screen.getByText('Nut')).toBeInTheDocument();
    expect(screen.queryByText('Bolt')).not.toBeInTheDocument();
  });
});
