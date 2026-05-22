import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  { id: 'age', header: 'Age', accessor: 'age', editable: true, editorType: 'number' },
  { id: 'role', header: 'Role', accessor: 'role', editable: false },
];

describe('DataGrid — row edit mode', () => {
  it('starts row edit from the row controls', () => {
    const onRowEditStart = vi.fn();
    render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'row' }}
        onRowEditStart={onRowEditStart}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);

    expect(onRowEditStart).toHaveBeenCalledWith({ rowId: '0' });
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('commits all changed editable cells with Save', () => {
    const onRowEditEnd = vi.fn();
    render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'row' }}
        onRowEditEnd={onRowEditEnd}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    fireEvent.change(screen.getByDisplayValue('Alice'), {
      target: { value: 'Alicia' },
    });
    fireEvent.change(screen.getByDisplayValue('30'), {
      target: { value: '31' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onRowEditEnd).toHaveBeenCalledWith({
      rowId: '0',
      changes: {
        name: { oldValue: 'Alice', newValue: 'Alicia' },
        age: { oldValue: 30, newValue: 31 },
      },
      committed: true,
    });
  });

  it('discards row edits with Cancel', () => {
    const onRowEditEnd = vi.fn();
    render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'row' }}
        onRowEditEnd={onRowEditEnd}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    fireEvent.change(screen.getByDisplayValue('Alice'), {
      target: { value: 'Alicia' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onRowEditEnd).toHaveBeenCalledWith({
      rowId: '0',
      changes: {},
      committed: false,
    });
  });

  it('disables Save while row validation is invalid', async () => {
    const validatingColumns: ColumnDef<Person>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: 'name',
        editable: true,
        validate: (value) =>
          String(value).length >= 3 ? true : 'Use at least 3 characters',
      },
      { id: 'age', header: 'Age', accessor: 'age', editable: true },
    ];
    const onRowEditEnd = vi.fn();
    render(
      <DataGrid
        data={people}
        columns={validatingColumns}
        editable={{ mode: 'row' }}
        onRowEditEnd={onRowEditEnd}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    fireEvent.change(screen.getByDisplayValue('Alice'), {
      target: { value: 'Al' },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Use at least 3 characters',
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onRowEditEnd).not.toHaveBeenCalled();
  });
});
