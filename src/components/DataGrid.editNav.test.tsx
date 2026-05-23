import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Person {
  id: string;
  name: string;
  age: number;
  role: string;
}

const people: Person[] = [
  { id: '1', name: 'Alice', age: 30, role: 'Engineer' },
  { id: '2', name: 'Bob', age: 25, role: 'Designer' },
];

const columns: ColumnDef<Person>[] = [
  { id: 'name', header: 'Name', accessor: 'name', editable: true },
  { id: 'role', header: 'Role', accessor: 'role', editable: false },
  { id: 'age', header: 'Age', accessor: 'age', editable: true, editorType: 'number' },
];

describe('DataGrid — edit navigation', () => {
  it('commits and moves to the next editable cell on Tab', async () => {
    const onCellEditEnd = vi.fn();
    const onCellEditStart = vi.fn();
    const { container } = render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'cell' }}
        onCellEditEnd={onCellEditEnd}
        onCellEditStart={onCellEditStart}
      />,
    );

    fireEvent.doubleClick(container.querySelectorAll('.strata-cell')[0]);
    const input = document.activeElement as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Alicia' } });
    fireEvent.keyDown(input, { key: 'Tab' });

    expect(onCellEditEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        columnId: 'name',
        newValue: 'Alicia',
        committed: true,
      }),
    );
    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute('type', 'number');
    });
    expect(onCellEditStart).toHaveBeenLastCalledWith(
      expect.objectContaining({ rowId: '0', columnId: 'age', value: 30 }),
    );
  });

  it('moves backward on Shift+Tab', async () => {
    const onCellEditStart = vi.fn();
    const { container } = render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'cell' }}
        onCellEditStart={onCellEditStart}
      />,
    );

    fireEvent.doubleClick(container.querySelectorAll('.strata-cell')[2]);
    const input = document.activeElement as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });

    await waitFor(() => {
      expect(document.activeElement).toHaveValue('Alice');
    });
    expect(onCellEditStart).toHaveBeenLastCalledWith(
      expect.objectContaining({ rowId: '0', columnId: 'name' }),
    );
  });

  it('moves down in the same editable column on Enter', async () => {
    const onCellEditStart = vi.fn();
    const { container } = render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'cell' }}
        onCellEditStart={onCellEditStart}
      />,
    );

    fireEvent.doubleClick(container.querySelectorAll('.strata-cell')[0]);
    const input = document.activeElement as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(document.activeElement).toHaveValue('Bob');
    });
    expect(onCellEditStart).toHaveBeenLastCalledWith(
      expect.objectContaining({ rowId: '1', columnId: 'name', value: 'Bob' }),
    );
  });

  it('keeps focus in the invalid cell when navigation validation fails', async () => {
    const onCellEditEnd = vi.fn();
    const invalidColumns: ColumnDef<Person>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: 'name',
        editable: true,
        validate: (value) => (String(value).length >= 3 ? true : 'Too short'),
      },
      { id: 'age', header: 'Age', accessor: 'age', editable: true },
    ];
    const { container, findByRole } = render(
      <DataGrid
        data={people}
        columns={invalidColumns}
        editable={{ mode: 'cell' }}
        onCellEditEnd={onCellEditEnd}
      />,
    );

    fireEvent.doubleClick(container.querySelectorAll('.strata-cell')[0]);
    const input = document.activeElement as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Al' } });
    fireEvent.keyDown(input, { key: 'Tab' });

    expect(await findByRole('alert')).toHaveTextContent('Too short');
    expect(document.activeElement).toBe(input);
    expect(onCellEditEnd).not.toHaveBeenCalled();
  });
});
