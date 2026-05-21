import type { Cell } from '@tanstack/react-table';
import { TREE_INDENT_WIDTH } from '../model/constants';
import { renderCellContent } from './render-cell-content';

export interface TreeCellProps<TRow> {
  /** The TanStack cell to render. */
  cell: Cell<TRow, unknown>;
}

/**
 * Renders the tree column's cell: depth indentation, an expand/collapse
 * control for rows that have children, and the cell content. Kept separate
 * from `DataCell` so hierarchy chrome never leaks into ordinary cells.
 */
export function TreeCell<TRow>({ cell }: TreeCellProps<TRow>) {
  const { row } = cell;
  const width = cell.column.getSize();
  const canExpand = row.getCanExpand();
  const expanded = row.getIsExpanded();

  return (
    <div
      className="strata-cell strata-tree-cell"
      role="gridcell"
      style={{ width }}
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
        >
          {expanded ? '▾' : '▸'}
        </button>
      ) : (
        <span
          className="strata-tree-toggle strata-tree-toggle-empty"
          aria-hidden="true"
        />
      )}
      <span className="strata-tree-label">{renderCellContent(cell)}</span>
    </div>
  );
}
