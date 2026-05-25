import { useCallback } from 'react';
import type { Table } from '@tanstack/react-table';
import type { UseSelectionReturn } from '../model/use-selection';
import { ColumnHeaderCell } from './ColumnHeaderCell';
import { ColumnGroupHeaderCell } from './ColumnGroupHeaderCell';
import { SelectionHeaderCell } from './SelectionHeaderCell';
import type { ColumnLayout } from './column-layout';

export interface HeaderAreaProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
  /** Shared column pane and virtual window layout. */
  columnLayout: ColumnLayout<TRow>;
  /** Horizontal scroll offset from the body scroller. */
  scrollLeft: number;
  /** Selection state and actions. Present only when selection is enabled. */
  selection?: UseSelectionReturn;
  /** Whether row-edit actions reserve a right-side action pane in body rows. */
  showRowEditControls?: boolean;
  /** Grid root element used to query rendered cells for autosize. */
  gridRootEl?: HTMLElement | null;
  /** Called after autosize measurement to commit the new column width. */
  onAutoSize?: (columnId: string, width: number) => void;
}

/** Renders the grid header with pinned-left, center, and pinned-right panes matching the body layout. */
export function HeaderArea<TRow>({
  table,
  columnLayout,
  scrollLeft,
  selection,
  showRowEditControls,
  gridRootEl,
  onAutoSize,
}: HeaderAreaProps<TRow>) {
  const handleColumnReorder = useCallback(
    (draggedId: string, targetId: string) => {
      const previousOrder = table.getState().columnOrder;
      const newOrder =
        previousOrder.length > 0
          ? [...previousOrder]
          : table.getAllLeafColumns().map((column) => column.id);
      const dragIdx = newOrder.indexOf(draggedId);
      const targetIdx = newOrder.indexOf(targetId);
      if (dragIdx === -1 || targetIdx === -1) return;
      newOrder.splice(dragIdx, 1);
      newOrder.splice(targetIdx, 0, draggedId);
      table.setColumnOrder(newOrder);
    },
    [table],
  );

  const leftGroups = table.getLeftHeaderGroups();
  const centerGroups = table.getCenterHeaderGroups();
  const rightGroups = table.getRightHeaderGroups();

  const hasLeft = leftGroups[0]?.headers.length > 0;
  const hasRight = rightGroups[0]?.headers.length > 0;
  const headerRowCount = Math.max(
    leftGroups.length,
    centerGroups.length,
    rightGroups.length,
  );

  return (
    <div className="strata-header" role="rowgroup">
      {Array.from({ length: headerRowCount }, (_, rowIndex) => (
        <div
          className={`strata-header-row${
            showRowEditControls ? ' strata-row-editing-enabled' : ''
          }`}
          role="row"
          key={rowIndex}
        >
          {selection && (
            <div className="strata-selection-pane">
              {rowIndex === 0 ? (
                <SelectionHeaderCell
                  checked={selection.allSelected}
                  indeterminate={selection.partiallySelected}
                  onChange={(checked) => selection.toggleAll(checked)}
                />
              ) : (
                <div className="strata-header-cell strata-selection-cell" role="columnheader" />
              )}
            </div>
          )}
          {hasLeft && (
            <div
              className="strata-pane-left"
              style={{ width: columnLayout.leftWidth, flexShrink: 0 }}
            >
              {renderHeaderRow(leftGroups[rowIndex]?.headers ?? [], handleColumnReorder, gridRootEl, onAutoSize)}
            </div>
          )}
          <div
            className="strata-pane-center strata-header-center"
            style={{ flex: '1 1 0', minWidth: 0 }}
          >
            <div
              className="strata-center-strip strata-header-center-strip"
              style={{
                width: columnLayout.centerWidth,
                transform: `translateX(${-scrollLeft}px)`,
              }}
            >
              {renderHeaderRow(centerGroups[rowIndex]?.headers ?? [], handleColumnReorder, gridRootEl, onAutoSize)}
            </div>
          </div>
          {showRowEditControls && (
            <div className="strata-row-edit-pane strata-row-edit-header-pane">
              <div className="strata-header-cell strata-row-edit-header-cell" role="columnheader">
                Actions
              </div>
            </div>
          )}
          {hasRight && (
            <div
              className="strata-pane-right"
              style={{ width: columnLayout.rightWidth, flexShrink: 0 }}
            >
              {renderHeaderRow(rightGroups[rowIndex]?.headers ?? [], handleColumnReorder, gridRootEl, onAutoSize)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function renderHeaderRow<TRow>(
  headers: import('@tanstack/react-table').Header<TRow, unknown>[],
  onColumnReorder: (draggedId: string, targetId: string) => void,
  gridRootEl?: HTMLElement | null,
  onAutoSize?: (columnId: string, width: number) => void,
) {
  return headers.map((header) => {
    if (header.subHeaders.length > 0 || header.isPlaceholder) {
      return <ColumnGroupHeaderCell key={header.id} header={header} />;
    }

    return (
      <ColumnHeaderCell
        key={header.id}
        header={header}
        onColumnReorder={onColumnReorder}
        gridRootEl={gridRootEl}
        onAutoSize={onAutoSize}
      />
    );
  });
}
