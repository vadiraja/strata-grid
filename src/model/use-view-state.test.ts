import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewState } from './use-view-state';
import type { ViewState } from './view-state-types';

const mockState: ViewState = {
  columnOrder: ['name', 'age', 'city'],
  columnSizing: { name: 200, age: 100 },
  columnPinning: { left: ['name'], right: [] },
  sorting: [{ columnId: 'name', direction: 'asc' }],
  filters: [],
  expandedIds: ['row-1', 'row-2'],
  hiddenColumns: ['city'],
};

describe('useViewState — export', () => {
  it('exports current state', () => {
    const { result } = renderHook(() =>
      useViewState({
        getColumnOrder: () => mockState.columnOrder,
        getColumnSizing: () => mockState.columnSizing,
        getColumnPinning: () => mockState.columnPinning,
        getSorting: () => mockState.sorting,
        getFilters: () => mockState.filters,
        getExpandedIds: () => mockState.expandedIds,
        getHiddenColumns: () => mockState.hiddenColumns,
      }),
    );

    const exported = result.current.exportState();
    expect(exported).toEqual(mockState);
  });
});

describe('useViewState — import', () => {
  it('calls all setters with imported state', () => {
    const setColumnOrder = vi.fn();
    const setColumnSizing = vi.fn();
    const setColumnPinning = vi.fn();
    const setSorting = vi.fn();
    const setFilters = vi.fn();
    const setExpandedIds = vi.fn();
    const setHiddenColumns = vi.fn();

    const { result } = renderHook(() =>
      useViewState({
        getColumnOrder: () => [],
        getColumnSizing: () => ({}),
        getColumnPinning: () => ({ left: [], right: [] }),
        getSorting: () => [],
        getFilters: () => [],
        getExpandedIds: () => [],
        getHiddenColumns: () => [],
        setColumnOrder,
        setColumnSizing,
        setColumnPinning,
        setSorting,
        setFilters,
        setExpandedIds,
        setHiddenColumns,
      }),
    );

    act(() => {
      result.current.importState(mockState);
    });

    expect(setColumnOrder).toHaveBeenCalledWith(mockState.columnOrder);
    expect(setColumnSizing).toHaveBeenCalledWith(mockState.columnSizing);
    expect(setColumnPinning).toHaveBeenCalledWith(mockState.columnPinning);
    expect(setSorting).toHaveBeenCalledWith(mockState.sorting);
    expect(setFilters).toHaveBeenCalledWith(mockState.filters);
    expect(setExpandedIds).toHaveBeenCalledWith(mockState.expandedIds);
    expect(setHiddenColumns).toHaveBeenCalledWith(mockState.hiddenColumns);
  });
});

describe('useViewState — graceful handling', () => {
  it('ignores unknown column ids in imported state', () => {
    const setColumnOrder = vi.fn();
    const { result } = renderHook(() =>
      useViewState({
        getColumnOrder: () => ['name', 'age'],
        getColumnSizing: () => ({}),
        getColumnPinning: () => ({ left: [], right: [] }),
        getSorting: () => [],
        getFilters: () => [],
        getExpandedIds: () => [],
        getHiddenColumns: () => [],
        setColumnOrder,
        validColumnIds: ['name', 'age'],
      }),
    );

    act(() => {
      result.current.importState({
        ...mockState,
        columnOrder: ['name', 'age', 'deleted-col'],
      });
    });

    // Should filter out unknown columns
    expect(setColumnOrder).toHaveBeenCalledWith(['name', 'age']);
  });
});
