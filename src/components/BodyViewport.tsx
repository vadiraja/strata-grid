import type { RefObject } from 'react';
import type { Table, Row, Cell } from '@tanstack/react-table';
import type { UseSelectionReturn } from '../model/use-selection';
import { GridRow } from './GridRow';
import { GroupRow } from './GroupRow';
import { RowEditControls } from './editors';
import { useRowVirtualizer } from '../virtual/use-row-virtualizer';
import type { ColumnLayout } from './column-layout';
import { useEditContext } from '../model/edit-context';
import type { ColumnDef } from '../model/types';
import type { UseAggregationReturn } from '../model/use-aggregation';
import type { UseBomRollupReturn } from '../model/use-bom-rollup';
import type { UseDragDropReturn } from '../tree-editor/use-drag-drop';

export interface BodyViewportProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
  /** Height of the scrollable body area in pixels. */
  height: number;
  /** Id of the tree column. Set only in tree mode. */
  treeColumnId?: string;
  /** Shared vertical and horizontal body scroll element. */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Shared column pane and virtual window layout. */
  columnLayout: ColumnLayout<TRow>;
  /** Horizontal offset controlled by the center scrollbar. */
  scrollLeft: number;
  /** Selection state and actions. Present only when selection is enabled. */
  selection?: UseSelectionReturn;
  /** The currently active body cell as [rowIndex, colIndex]. */
  activeCell?: [number, number];
  /** Visible column ids in keyboard order, including the synthetic selection column. */
  keyboardColumnIds?: string[];
  /** Set the active body cell. */
  onActiveCellChange?: (cell: [number, number]) => void;
  /** Aggregate state for grouped rows. */
  aggregation?: UseAggregationReturn<TRow>;
  /** Computed BOM extended quantities. */
  bomRollup?: UseBomRollupReturn;
  /** Drag/drop controller for tree reparenting. */
  dragDrop?: UseDragDropReturn;
}

/** Renders the grid body as a 3-pane virtualized scroll area. */
export function BodyViewport<TRow>({
  table,
  height,
  treeColumnId,
  scrollRef,
  columnLayout,
  scrollLeft,
  selection,
  activeCell,
  keyboardColumnIds = [],
  onActiveCellChange,
  aggregation,
  bomRollup,
  dragDrop,
}: BodyViewportProps<TRow>) {
  const rows = table.getRowModel().rows;
  const rowVirtualizer = useRowVirtualizer({ scrollRef, count: rows.length });
  const editCtx = useEditContext();
  const showRowEditControls = editCtx?.config.mode === 'row';

  if (rows.length === 0) {
    return (
      <div
        className="strata-body strata-body-empty"
        role="rowgroup"
        style={{ height }}
      >
        <div className="strata-empty">No data</div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="strata-body"
      role="rowgroup"
      style={{ height }}
    >
      <div
        className="strata-body-sizer"
        role="presentation"
        style={{
          height: rowVirtualizer.getTotalSize(),
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          const isTree = treeColumnId !== undefined;
          const focusedColumnId =
            activeCell?.[0] === virtualRow.index
              ? keyboardColumnIds[activeCell[1]]
              : undefined;
          const focusId =
            activeCell?.[0] === virtualRow.index
              ? `strata-cell-${activeCell[0]}-${activeCell[1]}`
              : undefined;
          const rowStyle: React.CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: virtualRow.size,
            transform: `translateY(${virtualRow.start}px)`,
            display: 'flex',
          };
          const focusColumn = (columnId: string) => {
            const columnIndex = keyboardColumnIds.indexOf(columnId);
            if (columnIndex >= 0) {
              onActiveCellChange?.([virtualRow.index, columnIndex]);
            }
          };

          if (row.getIsGrouped()) {
            return (
              <GroupRow
                key={virtualRow.key}
                row={row}
                style={rowStyle}
                isFocused={activeCell?.[0] === virtualRow.index}
                focusId={focusId}
                aggregateColumns={
                  aggregation?.aggregateColumns as ColumnDef<TRow>[] | undefined
                }
                aggregates={aggregation?.getGroupAggregates(row)}
              />
            );
          }

          return (
            <div
              key={virtualRow.key}
              className={[
                'strata-row-container',
                selection?.isSelected(row.id) && 'strata-row-selected',
                showRowEditControls && 'strata-row-editing-enabled',
              ]
                .filter(Boolean)
                .join(' ')}
              role="row"
              aria-level={isTree ? row.depth + 1 : undefined}
              aria-expanded={
                isTree && row.getCanExpand() ? row.getIsExpanded() : undefined
              }
              aria-selected={selection ? selection.isSelected(row.id) : undefined}
              style={rowStyle}
            >
              {selection && (
                <div className="strata-selection-pane">
                  <GridRow
                    row={row}
                    cells={[]}
                    renderAsRow={false}
                    selection={selection}
                    focusedColumnId={focusedColumnId}
                    focusId={focusId}
                    rollupTargetColumnId={bomRollup?.targetColumnId}
                    extendedQuantities={bomRollup?.extendedQuantities}
                    dragDrop={dragDrop}
                    onCellFocus={focusColumn}
                  />
                </div>
              )}
              {columnLayout.leftColumns.length > 0 && (
                <div
                  className="strata-pane-left"
                  style={{ width: columnLayout.leftWidth, flexShrink: 0 }}
                >
                  <GridRow
                    row={row}
                    treeColumnId={treeColumnId}
                    cells={getCellsForColumns(row, columnLayout.leftColumns)}
                    renderAsRow={false}
                    focusedColumnId={focusedColumnId}
                    focusId={focusId}
                    rollupTargetColumnId={bomRollup?.targetColumnId}
                    extendedQuantities={bomRollup?.extendedQuantities}
                    dragDrop={dragDrop}
                    onCellFocus={focusColumn}
                  />
                </div>
              )}
              <div
                className="strata-pane-center strata-body-center"
                style={{ flex: '1 1 0', minWidth: 0 }}
              >
                <div
                  className="strata-center-strip"
                  style={{
                    width: columnLayout.centerWidth,
                    transform: `translateX(${-scrollLeft}px)`,
                  }}
                >
                  {columnLayout.centerBeforeWidth > 0 && (
                    <div
                      className="strata-virtual-spacer"
                      style={{ width: columnLayout.centerBeforeWidth }}
                    />
                  )}
                  <GridRow
                    row={row}
                    treeColumnId={treeColumnId}
                    cells={getVirtualizedCenterCells(row, columnLayout)}
                    renderAsRow={false}
                    focusedColumnId={focusedColumnId}
                    focusId={focusId}
                    rollupTargetColumnId={bomRollup?.targetColumnId}
                    extendedQuantities={bomRollup?.extendedQuantities}
                    dragDrop={dragDrop}
                    onCellFocus={focusColumn}
                  />
                  {columnLayout.centerAfterWidth > 0 && (
                    <div
                      className="strata-virtual-spacer"
                      style={{ width: columnLayout.centerAfterWidth }}
                    />
                  )}
                </div>
              </div>
              {showRowEditControls && (
                <div className="strata-row-edit-pane">
                  <RowEditControls row={row} />
                </div>
              )}
              {columnLayout.rightColumns.length > 0 && (
                <div
                  className="strata-pane-right"
                  style={{ width: columnLayout.rightWidth, flexShrink: 0 }}
                >
                  <GridRow
                    row={row}
                    treeColumnId={treeColumnId}
                    cells={getCellsForColumns(row, columnLayout.rightColumns)}
                    renderAsRow={false}
                    focusedColumnId={focusedColumnId}
                    focusId={focusId}
                    dragDrop={dragDrop}
                    onCellFocus={focusColumn}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getCellsForColumns<TRow>(
  row: Row<TRow>,
  columns: { id: string }[],
): Cell<TRow, unknown>[] {
  const columnIds = new Set(columns.map((c) => c.id));
  return row.getVisibleCells().filter((cell) => columnIds.has(cell.column.id));
}

function getVirtualizedCenterCells<TRow>(
  row: Row<TRow>,
  columnLayout: Pick<ColumnLayout<TRow>, 'centerColumns' | 'centerVirtualItems'>,
): Cell<TRow, unknown>[] {
  const allCells = row.getVisibleCells();
  const centerIds = new Set(columnLayout.centerColumns.map((c) => c.id));
  const centerCells = allCells.filter((cell) => centerIds.has(cell.column.id));
  return columnLayout.centerVirtualItems
    .map((vi) => centerCells[vi.index])
    .filter(Boolean);
}
