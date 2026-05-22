import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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
  { id: '3', name: 'Charlie', age: 35, role: 'Manager' },
];

const columns: ColumnDef<Person>[] = [
  { id: 'name', header: 'Name', accessor: 'name', editable: true },
  { id: 'age', header: 'Age', accessor: 'age', editable: true, editorType: 'number' },
  { id: 'role', header: 'Role', accessor: 'role', editable: false },
];

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
    // Third cell in first row is "role" (not editable)
    fireEvent.doubleClick(cells[2]);
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
