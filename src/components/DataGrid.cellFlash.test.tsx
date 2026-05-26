import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Row { id: string; price: number }
const columns: ColumnDef<Row>[] = [
  { id: 'price', header: 'Price', accessor: 'price' },
];

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('DataGrid — flashOnUpdate', () => {
  it('does not flash when flashOnUpdate is omitted', () => {
    const { rerender } = render(
      <DataGrid data={[{ id: '1', price: 10 }]} columns={columns} />,
    );
    rerender(<DataGrid data={[{ id: '1', price: 99 }]} columns={columns} />);
    const cell = document.querySelector('[data-strata-cell-column="price"]') as HTMLElement;
    expect(cell.className).not.toContain('strata-cell-flash');
  });

  it('flashes the changed cell when flashOnUpdate=true', () => {
    const { rerender } = render(
      <DataGrid data={[{ id: '1', price: 10 }]} columns={columns} flashOnUpdate />,
    );
    rerender(<DataGrid data={[{ id: '1', price: 99 }]} columns={columns} flashOnUpdate />);
    const cell = document.querySelector('[data-strata-cell-column="price"]') as HTMLElement;
    expect(cell.className).toContain('strata-cell-flash');
  });

  it('clears the flash class after the configured duration', () => {
    const { rerender } = render(
      <DataGrid
        data={[{ id: '1', price: 10 }]}
        columns={columns}
        flashOnUpdate={{ durationMs: 200 }}
      />,
    );
    rerender(
      <DataGrid
        data={[{ id: '1', price: 99 }]}
        columns={columns}
        flashOnUpdate={{ durationMs: 200 }}
      />,
    );
    const cell = document.querySelector('[data-strata-cell-column="price"]') as HTMLElement;
    expect(cell.className).toContain('strata-cell-flash');
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(cell.className).not.toContain('strata-cell-flash');
  });
});
