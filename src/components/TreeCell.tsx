import type { Cell } from '@tanstack/react-table';
import { TREE_INDENT_WIDTH } from '../model/constants';
import { renderCellContent } from './render-cell-content';

export interface TreeCellProps<TRow> {
  /** The TanStack cell to render. */
  cell: Cell<TRow, unknown>;
  /** Whether this cell is the active keyboard cell. */
  isFocused?: boolean;
  /** Stable active-descendant id when focused. */
  focusId?: string;
  /** Column id that displays computed BOM extended quantities. */
  rollupTargetColumnId?: string;
  /** Extended quantities keyed by row id. */
  extendedQuantities?: Map<string, number>;
}

/**
 * Renders the tree column's cell: depth indentation, an expand/collapse
 * control for rows that have children, and the cell content. Kept separate
 * from `DataCell` so hierarchy chrome never leaks into ordinary cells.
 */
export function TreeCell<TRow>({
  cell,
  isFocused,
  focusId,
  rollupTargetColumnId,
  extendedQuantities,
}: TreeCellProps<TRow>) {
  const { row } = cell;
  const width = cell.column.getSize();
  const canExpand = row.getCanExpand();
  const expanded = row.getIsExpanded();

  return (
    <div
      className={`strata-cell strata-tree-cell${isFocused ? ' strata-cell-focused' : ''}`}
      role="gridcell"
      id={isFocused ? focusId : undefined}
      style={{ width, flex: `0 0 ${width}px` }}
    >
      <span
        className="strata-tree-indent"
        style={{ width: row.depth * TREE_INDENT_WIDTH }}
        aria-hidden="true"
      />
      {canExpand ? (
        <button
          type="button"
          className="strata-tree-toggle"
          aria-label={expanded ? 'Collapse row' : 'Expand row'}
          onClick={row.getToggleExpandedHandler()}
          tabIndex={-1}
        >
          {expanded ? '▾' : '▸'}
        </button>
      ) : (
        <span
          className="strata-tree-toggle strata-tree-toggle-empty"
          aria-hidden="true"
        />
      )}
      <span className="strata-tree-label">
        {cell.column.id === rollupTargetColumnId &&
        extendedQuantities?.has(cell.row.id)
          ? extendedQuantities.get(cell.row.id)
          : renderCellContent(cell)}
      </span>
    </div>
  );
}
