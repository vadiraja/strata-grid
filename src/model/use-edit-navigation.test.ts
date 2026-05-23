import { describe, expect, it } from 'vitest';
import { resolveEditableNavigationTarget, type EditNavigationGrid } from './use-edit-navigation';
import type { ColumnDef } from './types';

interface Row {
  id: string;
  name: string;
  age: number;
  role: string;
}

const columns: Record<string, ColumnDef<Row>> = {
  name: { id: 'name', header: 'Name', accessor: 'name', editable: true },
  age: { id: 'age', header: 'Age', accessor: 'age', editable: true },
  role: { id: 'role', header: 'Role', accessor: 'role', editable: false },
};

function grid(): EditNavigationGrid<Row> {
  const rows: Row[] = [
    { id: 'r1', name: 'Alice', age: 30, role: 'Engineer' },
    { id: 'r2', name: 'Bob', age: 25, role: 'Designer' },
    { id: 'r3', name: 'Charlie', age: 35, role: 'Manager' },
  ];

  return {
    columnIds: ['name', 'role', 'age'],
    rows: rows.map((row) => ({
      id: row.id,
      original: row,
      cells: [
        { columnId: 'name', value: row.name, column: columns.name },
        { columnId: 'role', value: row.role, column: columns.role },
        { columnId: 'age', value: row.age, column: columns.age },
      ],
    })),
  };
}

describe('resolveEditableNavigationTarget', () => {
  it('moves to the next editable cell and skips read-only cells', () => {
    expect(
      resolveEditableNavigationTarget(
        grid(),
        { rowId: 'r1', columnId: 'name' },
        'next',
      ),
    ).toMatchObject({ rowId: 'r1', columnId: 'age', value: 30 });
  });

  it('wraps Tab navigation to the next row', () => {
    expect(
      resolveEditableNavigationTarget(
        grid(),
        { rowId: 'r1', columnId: 'age' },
        'next',
      ),
    ).toMatchObject({ rowId: 'r2', columnId: 'name', value: 'Bob' });
  });

  it('wraps Shift+Tab navigation to the previous row', () => {
    expect(
      resolveEditableNavigationTarget(
        grid(),
        { rowId: 'r2', columnId: 'name' },
        'previous',
      ),
    ).toMatchObject({ rowId: 'r1', columnId: 'age', value: 30 });
  });

  it('moves Enter navigation down within the same editable column', () => {
    expect(
      resolveEditableNavigationTarget(
        grid(),
        { rowId: 'r1', columnId: 'age' },
        'down',
      ),
    ).toMatchObject({ rowId: 'r2', columnId: 'age', value: 25 });
  });

  it('returns null when no target exists', () => {
    expect(
      resolveEditableNavigationTarget(
        grid(),
        { rowId: 'r3', columnId: 'age' },
        'next',
      ),
    ).toBeNull();
  });
});
