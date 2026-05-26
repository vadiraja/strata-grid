import { describe, expect, it, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Row { id: string; amount: number }
const rows: Row[] = [
  { id: '1', amount: 10 },
  { id: '2', amount: -5 },
];

afterEach(cleanup);

describe('DataCell — cellClass / cellStyle', () => {
  it('applies cellClass when the predicate returns a string', () => {
    const columns: ColumnDef<Row>[] = [
      {
        id: 'amount',
        header: 'Amount',
        accessor: 'amount',
        cellClass: ({ value }) => ((value as number) < 0 ? 'neg' : undefined),
      },
    ];
    render(<DataGrid data={rows} columns={columns} />);
    const cells = document.querySelectorAll('[data-strata-cell-column="amount"]');
    expect(cells[0].className).not.toContain('neg');
    expect(cells[1].className).toContain('neg');
  });

  it('merges cellStyle into the cell style attribute', () => {
    const columns: ColumnDef<Row>[] = [
      {
        id: 'amount',
        header: 'Amount',
        accessor: 'amount',
        cellStyle: ({ value }) =>
          (value as number) < 0 ? { color: 'rgb(255, 0, 0)' } : undefined,
      },
    ];
    render(<DataGrid data={rows} columns={columns} />);
    const cells = document.querySelectorAll(
      '[data-strata-cell-column="amount"]',
    ) as NodeListOf<HTMLElement>;
    expect(cells[0].style.color).toBe('');
    expect(cells[1].style.color).toBe('rgb(255, 0, 0)');
  });

  it('passes row data to cellClass via CellContext', () => {
    const seen: Row[] = [];
    const columns: ColumnDef<Row>[] = [
      {
        id: 'amount',
        header: 'Amount',
        accessor: 'amount',
        cellClass: (ctx) => {
          seen.push(ctx.row);
          return undefined;
        },
      },
    ];
    render(<DataGrid data={rows} columns={columns} />);
    expect(seen).toContainEqual({ id: '1', amount: 10 });
    expect(seen).toContainEqual({ id: '2', amount: -5 });
  });
});
