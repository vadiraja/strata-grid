import { getLeafColumns, normalizeColumns } from './normalize-columns';
import type { AnyColumn, ColumnDef, ColumnGroup } from './types';
import type { ColumnDef as TanstackColumnDef } from '@tanstack/react-table';

interface Row {
  name: string;
  desc: string;
  qty: number;
  uom: string;
}

const nameCol: ColumnDef<Row> = {
  id: 'name',
  header: 'Name',
  accessor: 'name',
  width: 140,
};
const descCol: ColumnDef<Row> = {
  id: 'desc',
  header: 'Description',
  accessor: 'desc',
};
const qtyCol: ColumnDef<Row> = {
  id: 'qty',
  header: 'Qty',
  accessor: 'qty',
  width: 80,
  filter: 'number',
};
const uomCol: ColumnDef<Row> = {
  id: 'uom',
  header: 'UoM',
  accessor: 'uom',
  pin: 'right',
};

function childColumns(column: TanstackColumnDef<Row>) {
  return 'columns' in column ? column.columns : undefined;
}

describe('normalizeColumns', () => {
  it('converts flat columns to TanStack leaves', () => {
    const result = normalizeColumns<Row>([nameCol, qtyCol]);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('name');
    expect(result[0]).toHaveProperty('accessorFn');
    expect(result[0]).not.toHaveProperty('columns');
    expect(result[0].size).toBe(140);
  });

  it('converts single-level groups to TanStack groups', () => {
    const group: ColumnGroup<Row> = {
      groupId: 'quantity',
      header: 'Quantity',
      columns: [qtyCol, uomCol],
    };

    const result = normalizeColumns<Row>([nameCol, group]);

    expect(result[1].id).toBe('quantity');
    expect(result[1].header).toBe('Quantity');
    expect(childColumns(result[1])).toHaveLength(2);
    expect(childColumns(result[1])?.[0].id).toBe('qty');
  });

  it('converts nested groups recursively', () => {
    const columns: AnyColumn<Row>[] = [
      {
        groupId: 'details',
        header: 'Details',
        columns: [
          nameCol,
          {
            groupId: 'quantity',
            header: 'Quantity',
            columns: [qtyCol, uomCol],
          },
        ],
      },
    ];

    const result = normalizeColumns(columns);
    const outerChildren = childColumns(result[0]);
    expect(outerChildren?.[1].id).toBe('quantity');
    expect(childColumns(outerChildren![1])).toHaveLength(2);
  });

  it('preserves filter and pin metadata on leaves', () => {
    const result = normalizeColumns<Row>([qtyCol, uomCol]);

    expect(result[0].enableColumnFilter).toBe(true);
    expect(result[1].meta?.strataColumn.pin).toBe('right');
  });
});

describe('getLeafColumns', () => {
  it('returns leaves from flat and grouped columns in order', () => {
    const columns: AnyColumn<Row>[] = [
      nameCol,
      {
        groupId: 'details',
        header: 'Details',
        columns: [descCol, { groupId: 'quantity', header: 'Quantity', columns: [qtyCol, uomCol] }],
      },
    ];

    expect(getLeafColumns(columns).map((column) => column.id)).toEqual([
      'name',
      'desc',
      'qty',
      'uom',
    ]);
  });
});
