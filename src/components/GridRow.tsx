import type { CSSProperties } from 'react';
import type { Row, Cell } from '@tanstack/react-table';
import type { UseSelectionReturn } from '../model/use-selection';
import { DataCell } from './DataCell';
import { TreeCell } from './TreeCell';
import { SelectionCell } from './SelectionCell';

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
  /** Whether this component should expose the ARIA row role. */
  renderAsRow?: boolean;
  /** Selection state and actions. Present only when selection is enabled. */
  selection?: UseSelectionReturn;
  /** The active cell's column id for this row, if any. */
  focusedColumnId?: string;
  /** Stable active-descendant id when a cell in this row is focused. */
  focusId?: string;
}

/** Renders one body row as a horizontal strip of cells. */
export function GridRow<TRow>({
  row,
  style,
  treeColumnId,
  cells,
  renderAsRow = true,
  selection,
  focusedColumnId,
  focusId,
}: GridRowProps<TRow>) {
  const isTree = treeColumnId !== undefined;
  const cellsToRender = cells ?? row.getVisibleCells();
  const isSelected = selection?.isSelected(row.id) ?? false;
  const isIndeterminate = selection?.isIndeterminate(row.id) ?? false;

  return (
    <div
      className={`strata-row${isSelected ? ' strata-row-selected' : ''}`}
      role={renderAsRow ? 'row' : undefined}
      style={style}
      aria-level={renderAsRow && isTree ? row.depth + 1 : undefined}
      aria-expanded={
        renderAsRow && isTree && row.getCanExpand()
          ? row.getIsExpanded()
          : undefined
      }
      aria-selected={renderAsRow && selection ? isSelected : undefined}
    >
      {selection && (
        <SelectionCell
          checked={isSelected}
          indeterminate={isIndeterminate}
          onChange={(checked) => selection.toggleRow(row.id, checked)}
          rowId={row.id}
          isFocused={focusedColumnId === '__selection__'}
          focusId={focusId}
        />
      )}
      {cellsToRender.map((cell) => {
        const isFocused = focusedColumnId === cell.column.id;
        return cell.column.id === treeColumnId ? (
          <TreeCell
            key={cell.id}
            cell={cell}
            isFocused={isFocused}
            focusId={focusId}
          />
        ) : (
          <DataCell
            key={cell.id}
            cell={cell}
            isFocused={isFocused}
            focusId={focusId}
          />
        );
      })}
    </div>
  );
}
