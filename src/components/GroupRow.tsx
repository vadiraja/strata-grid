import type { CSSProperties } from 'react';
import type { Row } from '@tanstack/react-table';

export interface GroupRowProps<TRow> {
  /** The TanStack group row. */
  row: Row<TRow>;
  /** Positioning style applied by the row virtualizer. */
  style?: CSSProperties;
  /** Whether the active-descendant focus is currently on this row. */
  isFocused?: boolean;
  /** Stable active-descendant id when this group row is focused. */
  focusId?: string;
}

function countDataRows<TRow>(rows: Row<TRow>[]): number {
  return rows.reduce((count, row) => {
    if (row.getIsGrouped()) {
      return count + countDataRows(row.subRows);
    }

    return count + 1;
  }, 0);
}

/** Renders a synthetic row-group header produced by TanStack grouping. */
export function GroupRow<TRow>({
  row,
  style,
  isFocused,
  focusId,
}: GroupRowProps<TRow>) {
  const isExpanded = row.getIsExpanded();
  const groupingColumnId = row.groupingColumnId;
  const groupValue = groupingColumnId ? row.getValue(groupingColumnId) : '';
  const leafCount = countDataRows(row.subRows);
  const label =
    groupValue === undefined || groupValue === null || groupValue === ''
      ? '(empty)'
      : String(groupValue);

  return (
    <div
      className={`strata-row-container strata-group-row strata-group-row-depth-${row.depth}`}
      role="row"
      aria-expanded={row.getCanExpand() ? isExpanded : undefined}
      aria-level={row.depth + 1}
      style={style}
    >
      <div
        id={focusId}
        className={`strata-group-cell${isFocused ? ' strata-cell-focused' : ''}`}
        role="gridcell"
        style={{ paddingLeft: `calc(var(--strata-cell-padding-x) + ${row.depth * 20}px)` }}
      >
        <button
          className="strata-group-toggle"
          type="button"
          aria-label={isExpanded ? `Collapse ${label}` : `Expand ${label}`}
          onClick={row.getToggleExpandedHandler()}
        >
          {isExpanded ? '-' : '+'}
        </button>
        <span className="strata-group-label">{label}</span>
        <span className="strata-group-count">({leafCount})</span>
      </div>
    </div>
  );
}
