import { useCallback, useState } from 'react';
import type { Table } from '@tanstack/react-table';
import { ColumnHeaderCell } from './ColumnHeaderCell';

export interface HeaderAreaProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
}

/** Renders the grid header with pinned-left, center, and pinned-right panes matching the body layout. */
export function HeaderArea<TRow>({ table }: HeaderAreaProps<TRow>) {
  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    table.getAllLeafColumns().map((c) => c.id),
  );

  const handleColumnReorder = useCallback(
    (draggedId: string, targetId: string) => {
      setColumnOrder((prev) => {
        const newOrder = [...prev];
        const dragIdx = newOrder.indexOf(draggedId);
        const targetIdx = newOrder.indexOf(targetId);
        if (dragIdx === -1 || targetIdx === -1) return prev;
        newOrder.splice(dragIdx, 1);
        newOrder.splice(targetIdx, 0, draggedId);
        table.setColumnOrder(newOrder);
        return newOrder;
      });
    },
    [table],
  );

  void columnOrder;

  const leftGroups = table.getLeftHeaderGroups();
  const centerGroups = table.getCenterHeaderGroups();
  const rightGroups = table.getRightHeaderGroups();

  const leftWidth = table.getLeftVisibleLeafColumns().reduce((sum, col) => sum + col.getSize(), 0);
  const rightWidth = table.getRightVisibleLeafColumns().reduce((sum, col) => sum + col.getSize(), 0);

  const hasLeft = leftGroups[0]?.headers.length > 0;
  const hasRight = rightGroups[0]?.headers.length > 0;

  return (
    <div className="strata-header" role="rowgroup">
      <div className="strata-header-row" role="row">
        {hasLeft && (
          <div className="strata-pane-left" style={{ width: leftWidth, flexShrink: 0 }}>
            {leftGroups[0].headers.map((header) => (
              <ColumnHeaderCell key={header.id} header={header} onColumnReorder={handleColumnReorder} />
            ))}
          </div>
        )}
        <div className="strata-pane-center">
          {centerGroups[0]?.headers.map((header) => (
            <ColumnHeaderCell key={header.id} header={header} onColumnReorder={handleColumnReorder} />
          ))}
        </div>
        {hasRight && (
          <div className="strata-pane-right" style={{ width: rightWidth, flexShrink: 0 }}>
            {rightGroups[0].headers.map((header) => (
              <ColumnHeaderCell key={header.id} header={header} onColumnReorder={handleColumnReorder} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
