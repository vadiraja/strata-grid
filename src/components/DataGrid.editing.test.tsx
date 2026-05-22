import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Person {
  id: string;
  name: string;
  age: number;
  role: string;
  startDate: string;
  active: boolean;
}

const people: Person[] = [
  { id: '1', name: 'Alice', age: 30, role: 'Engineer', startDate: '2026-01-15', active: true },
  { id: '2', name: 'Bob', age: 25, role: 'Designer', startDate: '2026-02-20', active: false },
  { id: '3', name: 'Charlie', age: 35, role: 'Manager', startDate: '2026-03-10', active: true },
];

const columns: ColumnDef<Person>[] = [
  { id: 'name', header: 'Name', accessor: 'name', editable: true },
  { id: 'age', header: 'Age', accessor: 'age', editable: true, editorType: 'number' },
  {
    id: 'role',
    header: 'Role',
    accessor: 'role',
    editable: true,
    editorType: 'select',
    editorOptions: {
      choices: ['Engineer', 'Designer', 'Manager'],
    },
  },
  { id: 'startDate', header: 'Start Date', accessor: 'startDate', editable: true, editorType: 'date' },
  { id: 'active', header: 'Active', accessor: 'active', editable: true, editorType: 'checkbox' },
  { id: 'readonly', header: 'Readonly', accessor: 'role', editable: false },
];

afterEach(() => {
  vi.useRealTimers();
});

describe('DataGrid — cell activation', () => {
  it('fires onCellEditStart on double-click of editable cell', () => {
    const onCellEditStart = vi.fn();
    const { container } = render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'cell' }}
        onCellEditStart={onCellEditStart}
      />,
    );
    const cells = container.querySelectorAll('.strata-cell');
    // First data cell in first row should be "name" column
    fireEvent.doubleClick(cells[0]);
    expect(onCellEditStart).toHaveBeenCalledWith(
      expect.objectContaining({
        columnId: 'name',
        value: 'Alice',
      }),
    );
  });

  it('does not fire onCellEditStart on non-editable cell', () => {
    const onCellEditStart = vi.fn();
    const { container } = render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'cell' }}
        onCellEditStart={onCellEditStart}
      />,
    );
    const cells = container.querySelectorAll('.strata-cell');
    // Sixth cell in first row is explicitly read-only.
    fireEvent.doubleClick(cells[5]);
    expect(onCellEditStart).not.toHaveBeenCalled();
  });

  it('does not activate editing when editable prop is not provided', () => {
    const onCellEditStart = vi.fn();
    const { container } = render(
      <DataGrid
        data={people}
        columns={columns}
        onCellEditStart={onCellEditStart}
      />,
    );
    const cells = container.querySelectorAll('.strata-cell');
    fireEvent.doubleClick(cells[0]);
    expect(onCellEditStart).not.toHaveBeenCalled();
  });

  it('supports conditional editability via function', () => {
    const conditionalColumns: ColumnDef<Person>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: 'name',
        editable: (row) => row.role === 'Engineer',
      },
      { id: 'age', header: 'Age', accessor: 'age' },
    ];
    const onCellEditStart = vi.fn();
    const { container } = render(
      <DataGrid
        data={people}
        columns={conditionalColumns}
        editable={{ mode: 'cell' }}
        onCellEditStart={onCellEditStart}
      />,
    );
    const rows = container.querySelectorAll('.strata-row-container');
    // Alice (Engineer) — should be editable
    const aliceCells = rows[0]?.querySelectorAll('.strata-cell');
    if (aliceCells?.[0]) fireEvent.doubleClick(aliceCells[0]);
    expect(onCellEditStart).toHaveBeenCalledTimes(1);

    // Bob (Designer) — should NOT be editable
    onCellEditStart.mockClear();
    const bobCells = rows[1]?.querySelectorAll('.strata-cell');
    if (bobCells?.[0]) fireEvent.doubleClick(bobCells[0]);
    expect(onCellEditStart).not.toHaveBeenCalled();
  });
});

describe('DataGrid — edit commit/discard', () => {
  it('fires onCellEditEnd with committed: true on commit', () => {
    const onCellEditEnd = vi.fn();
    const { container } = render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'cell' }}
        onCellEditEnd={onCellEditEnd}
      />,
    );
    const cells = container.querySelectorAll('.strata-cell');
    // Activate editing
    fireEvent.doubleClick(cells[0]);
    // Activate a different cell (auto-commits the first)
    fireEvent.doubleClick(cells[1]);
    expect(onCellEditEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        columnId: 'name',
        committed: true,
      }),
    );
  });
});

describe('DataGrid — built-in editors', () => {
  it('renders a text editor and commits changed text', () => {
    const onCellEditEnd = vi.fn();
    const { container } = render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'cell' }}
        onCellEditEnd={onCellEditEnd}
      />,
    );

    fireEvent.doubleClick(container.querySelectorAll('.strata-cell')[0]);
    const input = document.activeElement as HTMLInputElement;
    expect(input).toHaveValue('Alice');

    fireEvent.change(input, { target: { value: 'Alicia' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onCellEditEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        columnId: 'name',
        newValue: 'Alicia',
        committed: true,
      }),
    );
  });

  it('renders a number editor and preserves numeric values', () => {
    const onCellEditEnd = vi.fn();
    const { container } = render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'cell' }}
        onCellEditEnd={onCellEditEnd}
      />,
    );

    fireEvent.doubleClick(container.querySelectorAll('.strata-cell')[1]);
    const input = document.activeElement as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'number');
    fireEvent.change(input, { target: { value: '31' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onCellEditEnd).toHaveBeenCalledWith(
      expect.objectContaining({ columnId: 'age', newValue: 31 }),
    );
  });

  it('renders select, date, and checkbox editors', () => {
    const onCellEditEnd = vi.fn();
    const { container } = render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'cell' }}
        onCellEditEnd={onCellEditEnd}
      />,
    );
    const cells = container.querySelectorAll('.strata-cell');

    fireEvent.doubleClick(cells[2]);
    const select = document.activeElement as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    fireEvent.change(select, { target: { value: '2' } });
    fireEvent.keyDown(select, { key: 'Enter' });
    expect(onCellEditEnd).toHaveBeenLastCalledWith(
      expect.objectContaining({ columnId: 'role', newValue: 'Manager' }),
    );

    fireEvent.doubleClick(cells[3]);
    const dateInput = document.activeElement as HTMLInputElement;
    expect(dateInput).toHaveAttribute('type', 'date');
    fireEvent.change(dateInput, { target: { value: '2026-04-01' } });
    fireEvent.keyDown(dateInput, { key: 'Enter' });
    expect(onCellEditEnd).toHaveBeenLastCalledWith(
      expect.objectContaining({ columnId: 'startDate', newValue: '2026-04-01' }),
    );

    fireEvent.doubleClick(cells[4]);
    const checkbox = document.activeElement as HTMLInputElement;
    expect(checkbox).toHaveAttribute('type', 'checkbox');
    fireEvent.click(checkbox);
    expect(onCellEditEnd).toHaveBeenLastCalledWith(
      expect.objectContaining({ columnId: 'active', newValue: false }),
    );
  });

  it('discards edits on Escape', () => {
    const onCellEditEnd = vi.fn();
    const { container } = render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'cell' }}
        onCellEditEnd={onCellEditEnd}
      />,
    );

    fireEvent.doubleClick(container.querySelectorAll('.strata-cell')[0]);
    const input = document.activeElement as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Discard me' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onCellEditEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        columnId: 'name',
        newValue: 'Discard me',
        committed: false,
      }),
    );
  });

  it('supports single-click and Enter activation modes', () => {
    const onSingleClickStart = vi.fn();
    const { container, rerender } = render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'cell', activateOn: 'singleClick' }}
        onCellEditStart={onSingleClickStart}
      />,
    );

    fireEvent.click(container.querySelectorAll('.strata-cell')[0]);
    expect(onSingleClickStart).toHaveBeenCalledWith(
      expect.objectContaining({ columnId: 'name' }),
    );

    const onEnterStart = vi.fn();
    rerender(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'cell', activateOn: 'enter' }}
        onCellEditStart={onEnterStart}
      />,
    );
    fireEvent.keyDown(container.querySelector('.strata-grid')!, { key: 'Enter' });
    expect(onEnterStart).toHaveBeenCalledWith(
      expect.objectContaining({ columnId: 'name' }),
    );
  });
});

describe('DataGrid — validation', () => {
  it('blocks invalid commits and shows the validation message', async () => {
    const onCellEditEnd = vi.fn();
    const validatingColumns: ColumnDef<Person>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: 'name',
        editable: true,
        validate: (value) =>
          String(value).length >= 3 ? true : 'Use at least 3 characters',
      },
    ];
    const { container } = render(
      <DataGrid
        data={people}
        columns={validatingColumns}
        editable={{ mode: 'cell' }}
        onCellEditEnd={onCellEditEnd}
      />,
    );

    fireEvent.doubleClick(container.querySelectorAll('.strata-cell')[0]);
    const input = document.activeElement as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Al' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Use at least 3 characters',
    );
    expect(document.activeElement).toBe(input);
    expect(onCellEditEnd).not.toHaveBeenCalled();
  });

  it('shows validating state while async validation is pending', async () => {
    const onCellEditEnd = vi.fn();
    const validatingColumns: ColumnDef<Person>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: 'name',
        editable: true,
        validate: async (value) => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return String(value).startsWith('A') ? true : 'Name must start with A';
        },
      },
    ];
    const { container } = render(
      <DataGrid
        data={people}
        columns={validatingColumns}
        editable={{ mode: 'cell' }}
        onCellEditEnd={onCellEditEnd}
      />,
    );

    fireEvent.doubleClick(container.querySelectorAll('.strata-cell')[0]);
    const input = document.activeElement as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Beth' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByRole('status')).toHaveTextContent('Validating...');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Name must start with A');
    });
    expect(onCellEditEnd).not.toHaveBeenCalled();
  });
});
