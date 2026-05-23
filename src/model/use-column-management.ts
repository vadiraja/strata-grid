import { useState, useCallback, useMemo } from 'react';

export interface ColumnInfo {
  id: string;
  header: string;
}

export interface UseColumnManagementOptions {
  /** All available columns. */
  columns: ColumnInfo[];
  /** Initially hidden column ids. */
  initialHidden?: string[];
  /** Columns that cannot be hidden. */
  alwaysVisible?: string[];
}

export interface UseColumnManagementReturn {
  /** Currently visible columns in order. */
  visibleColumns: ColumnInfo[];
  /** Hidden column ids. */
  hiddenColumns: string[];
  /** Current column order (all columns). */
  columnOrder: string[];
  /** Hide a column. */
  hideColumn: (columnId: string) => void;
  /** Show a hidden column. */
  showColumn: (columnId: string) => void;
  /** Toggle column visibility. */
  toggleColumn: (columnId: string) => void;
  /** Move a column to a new index. */
  moveColumn: (columnId: string, toIndex: number) => void;
  /** Reset to default order and visibility. */
  reset: () => void;
  /** Search columns by header text. */
  searchColumns: (term: string) => ColumnInfo[];
  /** Whether a column is visible. */
  isVisible: (columnId: string) => boolean;
}

export function useColumnManagement(
  options: UseColumnManagementOptions,
): UseColumnManagementReturn {
  const { columns, initialHidden = [], alwaysVisible = [] } = options;

  const defaultOrder = useMemo(() => columns.map((c) => c.id), [columns]);

  const [columnOrder, setColumnOrder] = useState<string[]>(defaultOrder);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(initialHidden);

  const visibleColumns = useMemo(
    () =>
      columnOrder
        .filter((id) => !hiddenColumns.includes(id))
        .map((id) => columns.find((c) => c.id === id)!)
        .filter(Boolean),
    [columnOrder, hiddenColumns, columns],
  );

  const hideColumn = useCallback(
    (columnId: string) => {
      // Prevent hiding always-visible columns
      if (alwaysVisible.includes(columnId)) return;

      setHiddenColumns((prev) => {
        // Prevent hiding the last visible column
        const visibleCount = columnOrder.filter((id) => !prev.includes(id)).length;
        if (visibleCount <= 1) return prev;
        if (prev.includes(columnId)) return prev;
        return [...prev, columnId];
      });
    },
    [alwaysVisible, columnOrder],
  );

  const showColumn = useCallback((columnId: string) => {
    setHiddenColumns((prev) => prev.filter((id) => id !== columnId));
  }, []);

  const toggleColumn = useCallback(
    (columnId: string) => {
      if (hiddenColumns.includes(columnId)) {
        showColumn(columnId);
      } else {
        hideColumn(columnId);
      }
    },
    [hiddenColumns, showColumn, hideColumn],
  );

  const moveColumn = useCallback((columnId: string, toIndex: number) => {
    setColumnOrder((prev) => {
      const next = prev.filter((id) => id !== columnId);
      next.splice(toIndex, 0, columnId);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setColumnOrder(defaultOrder);
    setHiddenColumns([]);
  }, [defaultOrder]);

  const searchColumns = useCallback(
    (term: string) => {
      const lower = term.toLowerCase();
      return columns.filter((c) =>
        (typeof c.header === 'string' ? c.header : c.id)
          .toLowerCase()
          .includes(lower),
      );
    },
    [columns],
  );

  const isVisible = useCallback(
    (columnId: string) => !hiddenColumns.includes(columnId),
    [hiddenColumns],
  );

  return {
    visibleColumns,
    hiddenColumns,
    columnOrder,
    hideColumn,
    showColumn,
    toggleColumn,
    moveColumn,
    reset,
    searchColumns,
    isVisible,
  };
}
