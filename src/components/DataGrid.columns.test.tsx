import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Row {
  id: string;
  a: string;
  b: string;
  c: string;
}

const data: Row[] = [
  { id: '1', a: 'A1', b: 'B1', c: 'C1' },
  { id: '2', a: 'A2', b: 'B2', c: 'C2' },
];

describe('DataGrid — column pinning', () => {
  it('renders pinned-left columns in a separate pane', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a', pin: 'left' },
      { id: 'b', header: 'Col B', accessor: 'b' },
      { id: 'c', header: 'Col C', accessor: 'c' },
    ];
    const { container } = render(<DataGrid data={data} columns={columns} />);
    // Panes appear in both header and body — combine all text to assert data presence
    const leftPanes = container.querySelectorAll('.strata-pane-left');
    expect(leftPanes.length).toBeGreaterThan(0);
    const combined = Array.from(leftPanes).map((el) => el.textContent).join('');
    expect(combined).toContain('A1');
  });

  it('renders pinned-right columns in a separate pane', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a' },
      { id: 'b', header: 'Col B', accessor: 'b' },
      { id: 'c', header: 'Col C', accessor: 'c', pin: 'right' },
    ];
    const { container } = render(<DataGrid data={data} columns={columns} />);
    const rightPanes = container.querySelectorAll('.strata-pane-right');
    expect(rightPanes.length).toBeGreaterThan(0);
    const combined = Array.from(rightPanes).map((el) => el.textContent).join('');
    expect(combined).toContain('C1');
  });

  it('does not render pinned panes when no columns are pinned', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a' },
      { id: 'b', header: 'Col B', accessor: 'b' },
    ];
    const { container } = render(<DataGrid data={data} columns={columns} />);
    expect(container.querySelector('.strata-pane-left')).toBeNull();
    expect(container.querySelector('.strata-pane-right')).toBeNull();
  });
});

describe('DataGrid — column resize', () => {
  it('renders a resize handle on each column header', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a' },
      { id: 'b', header: 'Col B', accessor: 'b' },
    ];
    const { container } = render(<DataGrid data={data} columns={columns} />);
    const handles = container.querySelectorAll('.strata-resize-handle');
    expect(handles).toHaveLength(2);
  });

  it('marks the resize handle as active during drag', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a' },
    ];
    const { container } = render(<DataGrid data={data} columns={columns} />);
    const handle = container.querySelector('.strata-resize-handle')!;
    fireEvent.mouseDown(handle);
    expect(handle.classList.contains('strata-resize-handle-active')).toBe(true);
  });
});

describe('DataGrid — column reorder', () => {
  it('makes header cells draggable', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a' },
      { id: 'b', header: 'Col B', accessor: 'b' },
    ];
    render(<DataGrid data={data} columns={columns} />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]).toHaveAttribute('draggable', 'true');
    expect(headers[1]).toHaveAttribute('draggable', 'true');
  });
});
