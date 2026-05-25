import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Row {
  id: string;
  a: number;
  b: number;
}
const rows: Row[] = [
  { id: '1', a: 10, b: 20 },
  { id: '2', a: 30, b: 40 },
];
const columns: ColumnDef<Row>[] = [
  { id: 'a', header: 'A', accessor: 'a' },
  { id: 'b', header: 'B', accessor: 'b' },
];

afterEach(cleanup);

describe('DataGrid — statusBar', () => {
  it('renders Rows total via default segment when enabled with true', () => {
    render(<DataGrid data={rows} columns={columns} statusBar />);
    expect(screen.getByText('Rows: 2')).toBeInTheDocument();
  });

  it('omits the status bar when statusBar prop is not provided', () => {
    render(<DataGrid data={rows} columns={columns} />);
    expect(screen.queryByText(/Rows:/)).toBeNull();
  });

  it('updates Sum on range drag', () => {
    render(<DataGrid data={rows} columns={columns} statusBar />);
    fireEvent.pointerDown(screen.getByText('10'), { button: 0 });
    fireEvent.pointerEnter(screen.getByText('40'));
    fireEvent.pointerUp(screen.getByText('40'));
    expect(screen.getByText('Sum: 100')).toBeInTheDocument();
  });

  it('getSegments replaces defaults', () => {
    render(
      <DataGrid
        data={rows}
        columns={columns}
        statusBar={{
          getSegments: () => [{ id: 'custom', label: 'Hello' }],
        }}
      />,
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.queryByText('Rows: 2')).toBeNull();
  });

  it('defaults: false hides built-in segments but keeps consumer segments', () => {
    render(
      <DataGrid
        data={rows}
        columns={columns}
        statusBar={{
          defaults: false,
          segments: [{ id: 'custom', label: 'OnlyMe' }],
        }}
      />,
    );
    expect(screen.getByText('OnlyMe')).toBeInTheDocument();
    expect(screen.queryByText('Rows: 2')).toBeNull();
  });
});
