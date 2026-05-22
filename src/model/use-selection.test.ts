import { act, renderHook } from '@testing-library/react';
import { useSelection } from './use-selection';

const allRowIds = ['root', 'A', 'A1', 'A2', 'B'];
const children: Record<string, string[]> = {
  root: ['A', 'B'],
  A: ['A1', 'A2'],
};
const parents: Record<string, string | null> = {
  root: null,
  A: 'root',
  A1: 'A',
  A2: 'A',
  B: 'root',
};

const getSubRowIds = (id: string) => children[id] ?? [];
const getParentId = (id: string) => parents[id] ?? null;

describe('useSelection', () => {
  it('starts with no selection', () => {
    const { result } = renderHook(() =>
      useSelection({ config: { mode: 'multi' }, allRowIds }),
    );
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('toggles rows in multi mode', () => {
    const { result } = renderHook(() =>
      useSelection({ config: { mode: 'multi' }, allRowIds }),
    );

    act(() => result.current.toggleRow('A'));
    act(() => result.current.toggleRow('B'));

    expect(result.current.selectedIds).toEqual(new Set(['A', 'B']));
  });

  it('replaces previous selection in single mode', () => {
    const { result } = renderHook(() =>
      useSelection({ config: { mode: 'single' }, allRowIds }),
    );

    act(() => result.current.toggleRow('A'));
    act(() => result.current.toggleRow('B'));

    expect(result.current.selectedIds).toEqual(new Set(['B']));
  });

  it('selects all rows in multi mode', () => {
    const { result } = renderHook(() =>
      useSelection({ config: { mode: 'multi' }, allRowIds }),
    );

    act(() => result.current.toggleAll());

    expect(result.current.allSelected).toBe(true);
    expect(result.current.selectedIds).toEqual(new Set(allRowIds));
  });

  it('cascades parent selection to descendants', () => {
    const { result } = renderHook(() =>
      useSelection({
        config: { mode: 'multi', cascade: true },
        allRowIds,
        getSubRowIds,
        getParentId,
      }),
    );

    act(() => result.current.toggleRow('A'));

    expect(result.current.selectedIds).toEqual(new Set(['A', 'A1', 'A2']));
  });

  it('marks a parent indeterminate for partial descendant selection', () => {
    const { result } = renderHook(() =>
      useSelection({
        config: { mode: 'multi', cascade: true },
        allRowIds,
        getSubRowIds,
        getParentId,
      }),
    );

    act(() => result.current.toggleRow('A1'));

    expect(result.current.isIndeterminate('A')).toBe(true);
    expect(result.current.isSelected('A')).toBe(false);
  });

  it('fires callback with updated selection', () => {
    const changes: Set<string>[] = [];
    const { result } = renderHook(() =>
      useSelection({
        config: { mode: 'multi' },
        allRowIds,
        onSelectionChange: (state) => changes.push(state.selectedIds),
      }),
    );

    act(() => result.current.toggleRow('A'));

    expect(changes).toEqual([new Set(['A'])]);
  });
});
