import { useCallback, useState } from 'react';
import type { Table } from '@tanstack/react-table';
import { ColumnHeaderCell } from './ColumnHeaderCell';

export interface HeaderAreaProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
}

/** Renders the grid header with pinned-left, center, and pinned-right panes. */
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

  // suppress unused variable warning — columnOrder drives table.setColumnOrder
  void columnOrder;

  return (
    <div className="strata-header" role="rowgroup">
      {table.getHeaderGroups().map((headerGroup) => (
        <div className="strata-header-row" role="row" key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <ColumnHeaderCell
              key={header.id}
              header={header}
              onColumnReorder={handleColumnReorder}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
