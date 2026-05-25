import { describe, expect, it, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Row {
  id: string;
  name: string;
}
const rows: Row[] = [
  { id: '1', name: 'short' },
  { id: '2', name: 'a much longer label that should drive the autosize' },
];
const columns: ColumnDef<Row>[] = [
  { id: 'name', header: 'Name', accessor: 'name', width: 80 },
];

afterEach(cleanup);

describe('DataGrid — column autosize', () => {
  it('double-click on resize handle updates the column width', () => {
    render(<DataGrid data={rows} columns={columns} />);
    document.querySelectorAll('[data-strata-cell-column="name"]').forEach((el, i) => {
      Object.defineProperty(el, 'scrollWidth', { configurable: true, value: i === 1 ? 240 : 30 });
    });
    const handle = document.querySelector('.strata-resize-handle')!;
    fireEvent.doubleClick(handle);
    const cell = document.querySelector('[data-strata-cell-column="name"]') as HTMLElement;
    expect(cell.style.width).toBe(`${240 + 16}px`);
  });
});
