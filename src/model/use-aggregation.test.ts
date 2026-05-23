import { describe, expect, it } from 'vitest';
import type { Row } from '@tanstack/react-table';
import type { ColumnDef } from './types';
import { computeAggregates } from './use-aggregation';

interface Part {
  name: string;
  qty: number | null;
  cost: number;
}

function makeRow(values: Partial<Part>): Row<Part> {
  return {
    id: String(values.name),
    getValue: (columnId: string) => values[columnId as keyof Part],
  } as Row<Part>;
}

describe('computeAggregates', () => {
  it('computes aggregate values for configured columns', () => {
    const columns: ColumnDef<Part>[] = [
      { id: 'name', header: 'Name', accessor: 'name' },
      { id: 'qty', header: 'Qty', accessor: 'qty', aggregate: 'sum' },
      { id: 'cost', header: 'Cost', accessor: 'cost', aggregate: 'avg' },
    ];

    const aggregates = computeAggregates(
      [
        makeRow({ name: 'A', qty: 2, cost: 10 }),
        makeRow({ name: 'B', qty: null, cost: 20 }),
        makeRow({ name: 'C', qty: 3, cost: 30 }),
      ],
      columns,
    );

    expect(aggregates.get('qty')).toBe(5);
    expect(aggregates.get('cost')).toBe(20);
    expect(aggregates.has('name')).toBe(false);
  });

  it('supports custom aggregate functions', () => {
    const columns: ColumnDef<Part>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: 'name',
        aggregate: (values) => values.join(', '),
      },
    ];

    const aggregates = computeAggregates(
      [makeRow({ name: 'A' }), makeRow({ name: 'B' })],
      columns,
    );

    expect(aggregates.get('name')).toBe('A, B');
  });
});
