import { useCallback } from 'react';
import type { ViewState } from './view-state-types';
import type { ColumnSort } from './types';
import type { FilterExpression } from '../data/types';

export interface UseViewStateOptions {
  // Getters
  getColumnOrder: () => string[];
  getColumnSizing: () => Record<string, number>;
  getColumnPinning: () => { left: string[]; right: string[] };
  getSorting: () => ColumnSort[];
  getFilters: () => FilterExpression[];
  getExpandedIds: () => string[];
  getHiddenColumns: () => string[];

  // Setters (optional — needed for import)
  setColumnOrder?: (order: string[]) => void;
  setColumnSizing?: (sizing: Record<string, number>) => void;
  setColumnPinning?: (pinning: { left: string[]; right: string[] }) => void;
  setSorting?: (sorting: ColumnSort[]) => void;
  setFilters?: (filters: FilterExpression[]) => void;
  setExpandedIds?: (ids: string[]) => void;
  setHiddenColumns?: (ids: string[]) => void;

  /** Valid column ids for filtering unknown columns on import. */
  validColumnIds?: string[];
}

export interface UseViewStateReturn {
  /** Export the current grid state. */
  exportState: () => ViewState;
  /** Import a saved grid state. */
  importState: (state: ViewState) => void;
}

/**
 * Hook for serializing and restoring grid view state.
 * Enables persistence to localStorage, backend, or any storage.
 */
export function useViewState(options: UseViewStateOptions): UseViewStateReturn {
  const {
    getColumnOrder,
    getColumnSizing,
    getColumnPinning,
    getSorting,
    getFilters,
    getExpandedIds,
    getHiddenColumns,
    setColumnOrder,
    setColumnSizing,
    setColumnPinning,
    setSorting,
    setFilters,
    setExpandedIds,
    setHiddenColumns,
    validColumnIds,
  } = options;

  const exportState = useCallback((): ViewState => {
    return {
      columnOrder: getColumnOrder(),
      columnSizing: getColumnSizing(),
      columnPinning: getColumnPinning(),
      sorting: getSorting(),
      filters: getFilters(),
      expandedIds: getExpandedIds(),
      hiddenColumns: getHiddenColumns(),
    };
  }, [
    getColumnOrder,
    getColumnSizing,
    getColumnPinning,
    getSorting,
    getFilters,
    getExpandedIds,
    getHiddenColumns,
  ]);

  const importState = useCallback(
    (state: ViewState) => {
      const filterIds = (ids: string[]) =>
        validColumnIds ? ids.filter((id) => validColumnIds.includes(id)) : ids;

      setColumnOrder?.(filterIds(state.columnOrder));
      setColumnSizing?.(state.columnSizing);
      setColumnPinning?.(state.columnPinning);
      setSorting?.(state.sorting);
      setFilters?.(state.filters);
      setExpandedIds?.(state.expandedIds);
      setHiddenColumns?.(filterIds(state.hiddenColumns));
    },
    [
      setColumnOrder,
      setColumnSizing,
      setColumnPinning,
      setSorting,
      setFilters,
      setExpandedIds,
      setHiddenColumns,
      validColumnIds,
    ],
  );

  return { exportState, importState };
}
