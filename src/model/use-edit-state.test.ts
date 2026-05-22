import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditState } from './use-edit-state';
import type { EditStateOptions } from './use-edit-state';

function createOptions(overrides: Partial<EditStateOptions> = {}): EditStateOptions {
  return {
    mode: 'cell',
    onCellEditStart: vi.fn(),
    onCellEditEnd: vi.fn(),
    ...overrides,
  };
}

describe('useEditState — initial state', () => {
  it('starts with no active cell', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    expect(result.current.activeCell).toBeNull();
  });

  it('starts with no dirty cells', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    expect(result.current.isDirty()).toBe(false);
  });
});

describe('useEditState — startEdit', () => {
  it('sets the active cell', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
    });
    expect(result.current.activeCell).toEqual({
      rowId: 'row-1',
      columnId: 'col-name',
      originalValue: 'Alice',
      pendingValue: 'Alice',
    });
  });

  it('fires onCellEditStart', () => {
    const onCellEditStart = vi.fn();
    const { result } = renderHook(() =>
      useEditState(createOptions({ onCellEditStart })),
    );
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
    });
    expect(onCellEditStart).toHaveBeenCalledWith({
      rowId: 'row-1',
      columnId: 'col-name',
      value: 'Alice',
    });
  });

  it('auto-commits previous cell if starting a new edit', () => {
    const onCellEditEnd = vi.fn();
    const { result } = renderHook(() =>
      useEditState(createOptions({ onCellEditEnd })),
    );
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
    });
    act(() => {
      result.current.startEdit('row-2', 'col-name', 'Charlie');
    });
    expect(onCellEditEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        rowId: 'row-1',
        columnId: 'col-name',
        newValue: 'Bob',
        committed: true,
      }),
    );
  });
});

describe('useEditState — setPendingValue', () => {
  it('updates the pending value', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
    });
    expect(result.current.activeCell?.pendingValue).toBe('Bob');
  });
});

describe('useEditState — commitEdit', () => {
  it('clears the active cell', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
      result.current.commitEdit();
    });
    expect(result.current.activeCell).toBeNull();
  });

  it('fires onCellEditEnd with committed: true', () => {
    const onCellEditEnd = vi.fn();
    const { result } = renderHook(() =>
      useEditState(createOptions({ onCellEditEnd })),
    );
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
      result.current.commitEdit();
    });
    expect(onCellEditEnd).toHaveBeenCalledWith({
      rowId: 'row-1',
      columnId: 'col-name',
      value: 'Alice',
      newValue: 'Bob',
      committed: true,
    });
  });

  it('adds to dirty state when value changed', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
      result.current.commitEdit();
    });
    expect(result.current.isDirty()).toBe(true);
    const dirty = result.current.getDirtyState();
    expect(dirty.get('row-1')?.get('col-name')).toBe('Bob');
  });

  it('does not add to dirty state when value unchanged', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.commitEdit();
    });
    expect(result.current.isDirty()).toBe(false);
  });

  it('no-ops when no active cell', () => {
    const onCellEditEnd = vi.fn();
    const { result } = renderHook(() =>
      useEditState(createOptions({ onCellEditEnd })),
    );
    act(() => {
      result.current.commitEdit();
    });
    expect(onCellEditEnd).not.toHaveBeenCalled();
  });
});

describe('useEditState — discardEdit', () => {
  it('clears the active cell', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
      result.current.discardEdit();
    });
    expect(result.current.activeCell).toBeNull();
  });

  it('fires onCellEditEnd with committed: false', () => {
    const onCellEditEnd = vi.fn();
    const { result } = renderHook(() =>
      useEditState(createOptions({ onCellEditEnd })),
    );
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
      result.current.discardEdit();
    });
    expect(onCellEditEnd).toHaveBeenCalledWith({
      rowId: 'row-1',
      columnId: 'col-name',
      value: 'Alice',
      newValue: 'Bob',
      committed: false,
    });
  });

  it('does not add to dirty state', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
      result.current.discardEdit();
    });
    expect(result.current.isDirty()).toBe(false);
  });
});

describe('useEditState — getDirtyState', () => {
  it('accumulates multiple edits', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
      result.current.commitEdit();
    });
    act(() => {
      result.current.startEdit('row-1', 'col-age', 25);
      result.current.setPendingValue(30);
      result.current.commitEdit();
    });
    act(() => {
      result.current.startEdit('row-2', 'col-name', 'Charlie');
      result.current.setPendingValue('Dave');
      result.current.commitEdit();
    });
    const dirty = result.current.getDirtyState();
    expect(dirty.size).toBe(2);
    expect(dirty.get('row-1')?.size).toBe(2);
    expect(dirty.get('row-2')?.get('col-name')).toBe('Dave');
  });

  it('clearDirtyState resets all dirty cells', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
      result.current.commitEdit();
    });
    act(() => {
      result.current.clearDirtyState();
    });
    expect(result.current.isDirty()).toBe(false);
  });
});

describe('useEditState — row edit mode', () => {
  it('starts a row edit with pending values', () => {
    const onRowEditStart = vi.fn();
    const { result } = renderHook(() =>
      useEditState(createOptions({ mode: 'row', onRowEditStart })),
    );

    act(() => {
      result.current.startRowEdit(
        'row-1',
        new Map<string, unknown>([
          ['name', 'Alice'],
          ['age', 30],
        ]),
      );
    });

    expect(onRowEditStart).toHaveBeenCalledWith({ rowId: 'row-1' });
    expect(result.current.activeRow?.rowId).toBe('row-1');
    expect(result.current.getRowPendingValue('name')).toBe('Alice');
  });

  it('commits row edit changes and adds them to dirty state', () => {
    const onRowEditEnd = vi.fn();
    const { result } = renderHook(() =>
      useEditState(createOptions({ mode: 'row', onRowEditEnd })),
    );

    act(() => {
      result.current.startRowEdit(
        'row-1',
        new Map<string, unknown>([
          ['name', 'Alice'],
          ['age', 30],
        ]),
      );
      result.current.setRowPendingValue('name', 'Alicia');
      result.current.commitRowEdit();
    });

    expect(onRowEditEnd).toHaveBeenCalledWith({
      rowId: 'row-1',
      changes: {
        name: { oldValue: 'Alice', newValue: 'Alicia' },
      },
      committed: true,
    });
    expect(result.current.activeRow).toBeNull();
    expect(result.current.getDirtyState().get('row-1')?.get('name')).toBe(
      'Alicia',
    );
  });

  it('discards row edit changes', () => {
    const onRowEditEnd = vi.fn();
    const { result } = renderHook(() =>
      useEditState(createOptions({ mode: 'row', onRowEditEnd })),
    );

    act(() => {
      result.current.startRowEdit('row-1', new Map([['name', 'Alice']]));
      result.current.setRowPendingValue('name', 'Alicia');
      result.current.discardRowEdit();
    });

    expect(onRowEditEnd).toHaveBeenCalledWith({
      rowId: 'row-1',
      changes: {},
      committed: false,
    });
    expect(result.current.activeRow).toBeNull();
    expect(result.current.isDirty()).toBe(false);
  });

  it('summarizes row validation state', () => {
    const { result } = renderHook(() =>
      useEditState(createOptions({ mode: 'row' })),
    );

    act(() => {
      result.current.startRowEdit('row-1', new Map([['name', 'Alice']]));
      result.current.setRowValidationState('name', 'validating');
    });
    expect(result.current.getRowValidationSummary()).toEqual({
      hasInvalid: false,
      hasValidating: true,
    });

    act(() => {
      result.current.setRowValidationState('name', 'invalid');
    });
    expect(result.current.getRowValidationSummary()).toEqual({
      hasInvalid: true,
      hasValidating: false,
    });
  });
});
