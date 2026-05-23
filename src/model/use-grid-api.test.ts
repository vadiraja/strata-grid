import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ColumnDef } from './types';
import { useEditState } from './use-edit-state';
import { useGridApi } from './use-grid-api';
import { useGridTable } from './use-grid-table';

interface Row {
  id: string;
  name: string;
  qty: number;
  readonly: string;
}

const data: Row[] = [
  { id: 'a', name: 'Alpha', qty: 2, readonly: 'x' },
  { id: 'b', name: 'Beta', qty: 3, readonly: 'y' },
];

const columns: ColumnDef<Row>[] = [
  { id: 'name', header: 'Name', accessor: 'name', editable: true },
  { id: 'qty', header: 'Qty', accessor: 'qty', editable: true },
  { id: 'readonly', header: 'Readonly', accessor: 'readonly' },
];

function useHarness(onCellEditEnd = vi.fn()) {
  const table = useGridTable({ data, columns });
  const editState = useEditState({ mode: 'cell', onCellEditEnd });
  const api = useGridApi({ table, editState });
  return { api, editState, onCellEditEnd };
}

describe('useGridApi', () => {
  it('starts and commits cell edits', () => {
    const onCellEditEnd = vi.fn();
    const { result } = renderHook(() => useHarness(onCellEditEnd));

    act(() => {
      result.current.api.startCellEdit('0', 'name');
    });

    expect(result.current.editState.activeCell).toEqual(
      expect.objectContaining({ rowId: '0', columnId: 'name' }),
    );

    act(() => {
      result.current.editState.setPendingValue('Alpine');
      result.current.api.commitEdit();
    });

    expect(onCellEditEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        rowId: '0',
        columnId: 'name',
        newValue: 'Alpine',
        committed: true,
      }),
    );
  });

  it('ignores read-only cells', () => {
    const { result } = renderHook(() => useHarness());

    act(() => {
      result.current.api.startCellEdit('0', 'readonly');
    });

    expect(result.current.editState.activeCell).toBeNull();
  });

  it('reports and clears dirty state', () => {
    const { result } = renderHook(() => useHarness());

    act(() => {
      result.current.api.startCellEdit('0', 'qty');
      result.current.editState.setPendingValue(7);
      result.current.api.commitEdit();
    });

    expect(result.current.api.isDirty()).toBe(true);
    expect(result.current.api.getDirtyState().get('0')?.get('qty')).toBe(7);

    act(() => {
      result.current.api.clearDirtyState();
    });

    expect(result.current.api.isDirty()).toBe(false);
  });

  it('starts and discards row edits', () => {
    const { result } = renderHook(() => useHarness());

    act(() => {
      result.current.api.startRowEdit('0');
    });

    expect(result.current.editState.activeRow?.rowId).toBe('0');
    expect(result.current.editState.activeRow?.pendingValues.get('name')).toBe(
      'Alpha',
    );

    act(() => {
      result.current.api.discardRowEdit();
    });

    expect(result.current.editState.activeRow).toBeNull();
  });
});
