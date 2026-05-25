import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Row { id: string; a: number; b: number; c: string }
const rows: Row[] = [
  { id: '1', a: 10, b: 20, c: 'x' },
  { id: '2', a: 30, b: 40, c: 'y' },
  { id: '3', a: 50, b: 60, c: 'z' },
];
const columns: ColumnDef<Row>[] = [
  { id: 'a', header: 'A', accessor: 'a', width: 80 },
  { id: 'b', header: 'B', accessor: 'b', width: 80 },
  { id: 'c', header: 'C', accessor: 'c', width: 80 },
];

describe('DataGrid — cell range', () => {
  it('drag-selects a 2x2 range and applies the in-range class', () => {
    render(<DataGrid data={rows} columns={columns} />);
    const cellA1 = screen.getByText('10');
    const cellB2 = screen.getByText('40');
    fireEvent.pointerDown(cellA1, { button: 0 });
    fireEvent.pointerEnter(cellB2);
    fireEvent.pointerUp(cellB2);
    expect(cellA1.className).toContain('strata-cell-in-range');
    expect(cellB2.className).toContain('strata-cell-in-range');
    expect(screen.getByText('20').className).toContain('strata-cell-in-range');
    expect(screen.getByText('30').className).toContain('strata-cell-in-range');
    expect(screen.getByText('z').className).not.toContain('strata-cell-in-range');
  });
});
