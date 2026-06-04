import { renderHook, act } from '@testing-library/react';
import { useCellHistory } from './use-cell-history';

describe('useCellHistory', () => {
  it('records, undoes (reverse deltas), and redoes (forward deltas)', () => {
    const applied: any[] = [];
    const { result } = renderHook(() => useCellHistory({ apply: (t) => applied.push(t) }));
    act(() => result.current.record({ rowId: 'r1', edits: [{ columnId: 'a', oldValue: 1, newValue: 2 }] }));
    expect(result.current.canUndo()).toBe(true);
    act(() => result.current.undo());
    expect(applied[applied.length - 1]).toEqual({ rowId: 'r1', edits: [{ columnId: 'a', oldValue: 2, newValue: 1 }], source: 'undo' });
    expect(result.current.canRedo()).toBe(true);
    act(() => result.current.redo());
    expect(applied[applied.length - 1]).toEqual({ rowId: 'r1', edits: [{ columnId: 'a', oldValue: 1, newValue: 2 }], source: 'redo' });
  });

  it('recording after undo clears the redo stack', () => {
    const { result } = renderHook(() => useCellHistory({ apply: () => {} }));
    act(() => result.current.record({ rowId: 'r1', edits: [{ columnId: 'a', oldValue: 1, newValue: 2 }] }));
    act(() => result.current.undo());
    act(() => result.current.record({ rowId: 'r1', edits: [{ columnId: 'b', oldValue: 0, newValue: 5 }] }));
    expect(result.current.canRedo()).toBe(false);
  });

  it('undo/redo are no-ops on empty stacks', () => {
    const apply = vi.fn();
    const { result } = renderHook(() => useCellHistory({ apply }));
    act(() => result.current.undo());
    act(() => result.current.redo());
    expect(apply).not.toHaveBeenCalled();
    expect(result.current.canUndo()).toBe(false);
    expect(result.current.canRedo()).toBe(false);
  });
});
