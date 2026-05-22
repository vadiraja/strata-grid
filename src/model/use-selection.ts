import { useMemo, useState } from 'react';
import type { SelectionConfig, SelectionState } from './types';
import {
  cascadeSelect,
  computeIndeterminate,
  type GetParentId,
  type GetSubRowIds,
} from './selection-cascade';

export interface UseSelectionOptions {
  /** Selection behavior configuration. */
  config: SelectionConfig;
  /** All selectable row ids, including collapsed descendants in tree mode. */
  allRowIds: string[];
  /** Returns direct child row ids for cascade mode. */
  getSubRowIds?: GetSubRowIds;
  /** Returns direct parent row id for cascade mode. */
  getParentId?: GetParentId;
  /** Called whenever selected ids change. */
  onSelectionChange?: (state: SelectionState) => void;
}

export interface UseSelectionReturn {
  /** Set of currently selected row ids. */
  selectedIds: Set<string>;
  /** Set of parent row ids with partial descendant selection. */
  indeterminateIds: Set<string>;
  /** Whether every selectable row is selected. */
  allSelected: boolean;
  /** Whether some, but not all, selectable rows are selected. */
  partiallySelected: boolean;
  /** Returns whether the row id is selected. */
  isSelected: (rowId: string) => boolean;
  /** Returns whether the row id is indeterminate. */
  isIndeterminate: (rowId: string) => boolean;
  /** Toggles one row. */
  toggleRow: (rowId: string, nextChecked?: boolean) => void;
  /** Selects or clears every selectable row. */
  toggleAll: (nextChecked?: boolean) => void;
}

const emptyChildren: GetSubRowIds = () => [];
const emptyParent: GetParentId = () => null;

export function useSelection({
  config,
  allRowIds,
  getSubRowIds = emptyChildren,
  getParentId = emptyParent,
  onSelectionChange,
}: UseSelectionOptions): UseSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const indeterminateIds = useMemo(
    () =>
      config.cascade
        ? computeIndeterminate(selectedIds, getSubRowIds, getParentId)
        : new Set<string>(),
    [config.cascade, getParentId, getSubRowIds, selectedIds],
  );

  const allSelected =
    allRowIds.length > 0 && allRowIds.every((rowId) => selectedIds.has(rowId));
  const partiallySelected =
    selectedIds.size > 0 && (!allSelected || indeterminateIds.size > 0);

  const commitSelection = (next: Set<string>) => {
    setSelectedIds(next);
    onSelectionChange?.({ selectedIds: new Set(next) });
  };

  const toggleRow = (rowId: string, nextChecked?: boolean) => {
    const shouldSelect = nextChecked ?? !selectedIds.has(rowId);
    let next: Set<string>;

    if (config.mode === 'single') {
      next = shouldSelect ? new Set([rowId]) : new Set();
    } else if (config.cascade) {
      next = cascadeSelect(
        rowId,
        shouldSelect,
        selectedIds,
        getSubRowIds,
        getParentId,
      );
    } else {
      next = new Set(selectedIds);
      if (shouldSelect) {
        next.add(rowId);
      } else {
        next.delete(rowId);
      }
    }

    commitSelection(next);
  };

  const toggleAll = (nextChecked?: boolean) => {
    if (config.mode === 'single') return;

    const shouldSelect = nextChecked ?? !allSelected;
    commitSelection(shouldSelect ? new Set(allRowIds) : new Set());
  };

  return {
    selectedIds,
    indeterminateIds,
    allSelected,
    partiallySelected,
    isSelected: (rowId) => selectedIds.has(rowId),
    isIndeterminate: (rowId) => indeterminateIds.has(rowId),
    toggleRow,
    toggleAll,
  };
}
