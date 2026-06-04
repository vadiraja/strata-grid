import { renderHook, act } from '@testing-library/react';
import { useEditState } from './use-edit-state';

describe('useEditState.applyCellEdits', () => {
  it('writes multiple columns in one batch and fires onCellsChange once', () => {
    const onCellsChange = vi.fn();
    const { result } = renderHook(() => useEditState({ mode: 'cell', onCellsChange }));
    act(() => {
      result.current.applyCellEdits('r1', [
        { columnId: 'a', oldValue: 1, newValue: 2 },
        { columnId: 'b', oldValue: 'x', newValue: 'y' },
      ], { source: 'lookup' });
    });
    expect(onCellsChange).toHaveBeenCalledTimes(1);
    expect(onCellsChange).toHaveBeenCalledWith({
      rowId: 'r1',
      edits: [
        { columnId: 'a', oldValue: 1, newValue: 2 },
        { columnId: 'b', oldValue: 'x', newValue: 'y' },
      ],
      source: 'lookup',
    });
    const dirty = result.current.getDirtyState();
    expect(dirty.get('r1')?.get('a')).toBe(2);
    expect(dirty.get('r1')?.get('b')).toBe('y');
  });

  it('is a no-op for an empty edits array', () => {
    const onCellsChange = vi.fn();
    const { result } = renderHook(() => useEditState({ mode: 'cell', onCellsChange }));
    act(() => result.current.applyCellEdits('r1', [], { source: 'edit' }));
    expect(onCellsChange).not.toHaveBeenCalled();
  });

  it('defaults source to "edit"', () => {
    const onCellsChange = vi.fn();
    const { result } = renderHook(() => useEditState({ mode: 'cell', onCellsChange }));
    act(() => result.current.applyCellEdits('r1', [{ columnId: 'a', oldValue: 0, newValue: 1 }]));
    expect(onCellsChange.mock.calls[0][0].source).toBe('edit');
  });
});
