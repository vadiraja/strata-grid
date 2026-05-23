import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';
import type { GridApi } from '../model/use-grid-api';

interface Person {
  id: string;
  name: string;
  age: number;
}

const people: Person[] = [
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
];

const columns: ColumnDef<Person>[] = [
  { id: 'name', header: 'Name', accessor: 'name', editable: true },
  { id: 'age', header: 'Age', accessor: 'age', editable: true, editorType: 'number' },
];

describe('DataGrid — apiRef', () => {
  it('exposes editing methods that can start and commit a cell edit', async () => {
    const apiRef = createRef<GridApi<Person> | null>();
    const onCellEditEnd = vi.fn();
    render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'cell' }}
        apiRef={apiRef}
        onCellEditEnd={onCellEditEnd}
      />,
    );

    expect(apiRef.current).not.toBeNull();
    act(() => {
      apiRef.current!.startCellEdit('0', 'name');
    });

    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('Alice'), {
      target: { value: 'Alicia' },
    });

    act(() => {
      apiRef.current!.commitEdit();
    });

    expect(onCellEditEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        columnId: 'name',
        newValue: 'Alicia',
        committed: true,
      }),
    );
    await waitFor(() => expect(apiRef.current!.isDirty()).toBe(true));
    expect(apiRef.current!.getDirtyState().get('0')?.get('name')).toBe('Alicia');
  });

  it('exposes row edit methods', () => {
    const apiRef = createRef<GridApi<Person> | null>();
    render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'row' }}
        apiRef={apiRef}
      />,
    );

    act(() => {
      apiRef.current!.startRowEdit('0');
    });

    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();

    act(() => {
      apiRef.current!.discardRowEdit();
    });

    expect(screen.queryByDisplayValue('Alice')).not.toBeInTheDocument();
  });
});
