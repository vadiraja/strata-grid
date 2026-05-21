import { useRef } from 'react';
import type { Table, Row, Cell } from '@tanstack/react-table';
import { GridRow } from './GridRow';
import { useRowVirtualizer } from '../virtual/use-row-virtualizer';
import { useColumnVirtualizer } from '../virtual/use-column-virtualizer';

export interface BodyViewportProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
  /** Height of the scrollable body area in pixels. */
  height: number;
  /** Id of the tree column. Set only in tree mode. */
  treeColumnId?: string;
}

/** Renders the grid body as a 3-pane virtualized scroll area. */
export function BodyViewport<TRow>({
  table,
  height,
  treeColumnId,
}: BodyViewportProps<TRow>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const rowVirtualizer = useRowVirtualizer({ scrollRef, count: rows.length });

  const leftColumns = table.getLeftVisibleLeafColumns();
  const centerColumns = table.getCenterVisibleLeafColumns();
  const rightColumns = table.getRightVisibleLeafColumns();

  const centerWidths = centerColumns.map((col) => col.getSize());
  const colVirtualizer = useColumnVirtualizer({
    scrollRef,
    columnWidths: centerWidths,
  });

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

  const leftWidth = leftColumns.reduce((sum, col) => sum + col.getSize(), 0);
  const rightWidth = rightColumns.reduce((sum, col) => sum + col.getSize(), 0);

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
        style={{ height: rowVirtualizer.getTotalSize() }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          const rowStyle: React.CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: virtualRow.size,
            transform: `translateY(${virtualRow.start}px)`,
            display: 'flex',
          };

          return (
            <div key={virtualRow.key} className="strata-row-container" style={rowStyle}>
              {leftColumns.length > 0 && (
                <div className="strata-pane-left" style={{ width: leftWidth, flexShrink: 0 }}>
                  <GridRow
                    row={row}
                    treeColumnId={treeColumnId}
                    cells={getCellsForColumns(row, leftColumns)}
                  />
                </div>
              )}
              <div className="strata-pane-center" style={{ flex: '1 1 auto', overflow: 'hidden' }}>
                <div style={{ width: colVirtualizer.getTotalSize(), position: 'relative' }}>
                  <GridRow
                    row={row}
                    treeColumnId={treeColumnId}
                    cells={getVirtualizedCenterCells(row, centerColumns, colVirtualizer)}
                  />
                </div>
              </div>
              {rightColumns.length > 0 && (
                <div className="strata-pane-right" style={{ width: rightWidth, flexShrink: 0 }}>
                  <GridRow
                    row={row}
                    treeColumnId={treeColumnId}
                    cells={getCellsForColumns(row, rightColumns)}
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
  centerColumns: { id: string }[],
  colVirtualizer: { getVirtualItems: () => { index: number }[] },
): Cell<TRow, unknown>[] {
  const allCells = row.getVisibleCells();
  const centerIds = new Set(centerColumns.map((c) => c.id));
  const centerCells = allCells.filter((cell) => centerIds.has(cell.column.id));
  const virtualItems = colVirtualizer.getVirtualItems();
  return virtualItems.map((vi) => centerCells[vi.index]).filter(Boolean);
}
