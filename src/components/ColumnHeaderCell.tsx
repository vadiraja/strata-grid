import { useCallback, useRef } from 'react';
import type { Header } from '@tanstack/react-table';
import { SortIndicator } from './SortIndicator';
import { FilterPopover } from './FilterPopover';
import { ResizeHandle } from './ResizeHandle';
import { resolveFilterConfig } from '../data/resolve-filter-config';
import type { ColumnFilterConfig } from '../data/types';

export interface ColumnHeaderCellProps<TRow> {
  /** The TanStack header to render. */
  header: Header<TRow, unknown>;
  /** Callback when a column is dragged and dropped onto another. */
  onColumnReorder?: (draggedId: string, targetId: string) => void;
}

/** Renders a column header cell with sort, filter, resize, and reorder. */
export function ColumnHeaderCell<TRow>({
  header,
  onColumnReorder,
}: ColumnHeaderCellProps<TRow>) {
  const strataColumn = header.column.columnDef.meta!.strataColumn;
  const width = header.getSize();
  const canSort = header.column.getCanSort();
  const sortDirection = header.column.getIsSorted();
  const filterConfig = strataColumn.filter as
    | ColumnFilterConfig
    | false
    | undefined;
  const resolvedFilter =
    filterConfig === false || filterConfig === undefined
      ? null
      : resolveFilterConfig(filterConfig);

  // Track whether the current interaction is a drag/resize so we can suppress sort on click
  const didDragRef = useRef(false);

  const handleClick = (e: React.MouseEvent) => {
    // Suppress sort if the click came from a resize handle or after a drag operation
    if (!canSort) return;
    if (header.column.getIsResizing()) return;
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    // Don't sort if the click target is the resize handle
    if ((e.target as HTMLElement).closest('.strata-resize-handle')) return;
    header.column.getToggleSortingHandler()?.(e);
  };

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      // If the drag started from the resize handle, cancel it
      if ((e.target as HTMLElement).closest('.strata-resize-handle')) {
        e.preventDefault();
        return;
      }
      didDragRef.current = true;
      e.dataTransfer.setData('text/plain', header.column.id);
      e.dataTransfer.effectAllowed = 'move';
    },
    [header.column.id],
  );

  const handleDragEnd = useCallback(() => {
    // Reset after a short delay so the click event that fires after dragend is suppressed
    setTimeout(() => {
      didDragRef.current = false;
    }, 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId && draggedId !== header.column.id && onColumnReorder) {
        onColumnReorder(draggedId, header.column.id);
      }
    },
    [header.column.id, onColumnReorder],
  );

  return (
    <div
      className={`strata-header-cell${canSort ? ' strata-header-cell-sortable' : ''}`}
      role="columnheader"
      style={{ width, flex: `0 0 ${width}px` }}
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      aria-sort={
        sortDirection === 'asc'
          ? 'ascending'
          : sortDirection === 'desc'
            ? 'descending'
            : undefined
      }
    >
      <span className="strata-header-label">{strataColumn.header}</span>
      {canSort && <SortIndicator direction={sortDirection} />}
      {resolvedFilter && (
        <FilterPopover column={header.column} resolved={resolvedFilter} />
      )}
      <ResizeHandle header={header} />
    </div>
  );
}
