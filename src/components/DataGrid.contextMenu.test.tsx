import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Row { id: string; a: string }
const rows: Row[] = [{ id: '1', a: 'x' }];
const columns: ColumnDef<Row>[] = [{ id: 'a', header: 'A', accessor: 'a' }];

afterEach(cleanup);

describe('DataGrid — contextMenu', () => {
  it('right-click on a cell opens the menu with Copy', () => {
    render(<DataGrid data={rows} columns={columns} contextMenu />);
    fireEvent.contextMenu(screen.getByText('x'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('right-click on a header opens the menu with Auto-size', () => {
    render(<DataGrid data={rows} columns={columns} contextMenu />);
    fireEvent.contextMenu(screen.getByText('A'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Auto-size column')).toBeInTheDocument();
    expect(screen.getByText('Pin left')).toBeInTheDocument();
  });

  it('does not open when contextMenu prop is omitted', () => {
    render(<DataGrid data={rows} columns={columns} />);
    fireEvent.contextMenu(screen.getByText('x'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('getItems replaces defaults', () => {
    render(
      <DataGrid
        data={rows}
        columns={columns}
        contextMenu={{
          getItems: () => [{ id: 'custom', label: 'My Action', onSelect: () => {} }],
        }}
      />,
    );
    fireEvent.contextMenu(screen.getByText('x'));
    expect(screen.getByText('My Action')).toBeInTheDocument();
    expect(screen.queryByText('Copy')).toBeNull();
  });

  it('mode "append" merges defaults + consumer items', () => {
    render(
      <DataGrid
        data={rows}
        columns={columns}
        contextMenu={{
          mode: 'append',
          getItems: () => [{ id: 'extra', label: 'Extra', onSelect: () => {} }],
        }}
      />,
    );
    fireEvent.contextMenu(screen.getByText('x'));
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.getByText('Extra')).toBeInTheDocument();
  });
});
