import type { CSSProperties } from 'react';
import type { Row, Cell } from '@tanstack/react-table';
import { DataCell } from './DataCell';
import { TreeCell } from './TreeCell';

export interface GridRowProps<TRow> {
  /** The TanStack row to render. */
  row: Row<TRow>;
  /** Positioning style applied by the row virtualizer. */
  style?: CSSProperties;
  /** Id of the tree column. Set only in tree mode. */
  treeColumnId?: string;
  /**
   * Which cells to render. If omitted, renders all visible cells.
   * Used by the 3-pane layout to render only a subset (pinned or center).
   */
  cells?: Cell<TRow, unknown>[];
}

/** Renders one body row as a horizontal strip of cells. */
export function GridRow<TRow>({
  row,
  style,
  treeColumnId,
  cells,
}: GridRowProps<TRow>) {
  const isTree = treeColumnId !== undefined;
  const cellsToRender = cells ?? row.getVisibleCells();

  return (
    <div
      className="strata-row"
      role="row"
      style={style}
      aria-level={isTree ? row.depth + 1 : undefined}
      aria-expanded={
        isTree && row.getCanExpand() ? row.getIsExpanded() : undefined
      }
    >
      {cellsToRender.map((cell) =>
        cell.column.id === treeColumnId ? (
          <TreeCell key={cell.id} cell={cell} />
        ) : (
          <DataCell key={cell.id} cell={cell} />
        ),
      )}
    </div>
  );
}
