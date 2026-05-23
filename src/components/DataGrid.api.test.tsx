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

interface BomNode {
  id: string;
  name: string;
  children?: BomNode[];
}

const people: Person[] = [
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
];

const columns: ColumnDef<Person>[] = [
  { id: 'name', header: 'Name', accessor: 'name', editable: true },
  { id: 'age', header: 'Age', accessor: 'age', editable: true, editorType: 'number' },
];

const bom: BomNode[] = [
  {
    id: 'A',
    name: 'Assembly A',
    children: [
      { id: 'A1', name: 'Part A1' },
      { id: 'A2', name: 'Part A2' },
    ],
  },
  {
    id: 'B',
    name: 'Assembly B',
    children: [{ id: 'B1', name: 'Part B1' }],
  },
];

const bomColumns: ColumnDef<BomNode>[] = [
  { id: 'name', header: 'Name', accessor: 'name', isTreeColumn: true },
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

  it('exposes M3 tree editor methods', async () => {
    const apiRef = createRef<GridApi<BomNode> | null>();
    const onTreeChange = vi.fn();
    const { container } = render(
      <DataGrid
        data={bom}
        columns={bomColumns}
        treeData={{
          getRowId: (row) => row.id,
          getChildren: (row) => row.children,
        }}
        treeEditor={{}}
        defaultExpanded
        apiRef={apiRef}
        onTreeChange={onTreeChange}
      />,
    );

    expect(screen.getByText('Part A2')).toBeInTheDocument();

    act(() => {
      apiRef.current!.moveNode('A2', 'B');
    });

    await waitFor(() => expect(apiRef.current!.canUndo()).toBe(true));
    expect(apiRef.current!.isDirty()).toBe(true);
    expect(apiRef.current!.getChangeSet().moved).toEqual([
      { id: 'A2', oldParentId: 'A', newParentId: 'B' },
    ]);
    expect(onTreeChange).toHaveBeenCalled();

    const text = container.textContent ?? '';
    expect(text.indexOf('Part B1')).toBeLessThan(text.indexOf('Part A2'));

    act(() => {
      apiRef.current!.undo();
    });

    await waitFor(() => expect(apiRef.current!.canRedo()).toBe(true));
    const restored = container.textContent ?? '';
    expect(restored.indexOf('Part A1')).toBeLessThan(
      restored.indexOf('Part A2'),
    );
    expect(restored.indexOf('Part A2')).toBeLessThan(
      restored.indexOf('Assembly B'),
    );
  });

  it('renders DataGrid from tree editor state after delete and add operations', async () => {
    const apiRef = createRef<GridApi<BomNode> | null>();
    render(
      <DataGrid
        data={bom}
        columns={bomColumns}
        treeData={{
          getRowId: (row) => row.id,
          getChildren: (row) => row.children,
        }}
        treeEditor={{ generateId: () => 'A3' }}
        defaultExpanded
        apiRef={apiRef}
      />,
    );

    act(() => {
      apiRef.current!.deleteNode('A1');
    });

    await waitFor(() =>
      expect(screen.queryByText('Part A1')).not.toBeInTheDocument(),
    );

    act(() => {
      apiRef.current!.addNode('A', { id: 'A3', name: 'Part A3' });
    });

    expect(await screen.findByText('Part A3')).toBeInTheDocument();
  });
});
