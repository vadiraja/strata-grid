import type { Header } from '@tanstack/react-table';
import { SortIndicator } from './SortIndicator';
import { FilterPopover } from './FilterPopover';
import type { FilterType } from '../model/types';

export interface ColumnHeaderCellProps<TRow> {
  /** The TanStack header to render. */
  header: Header<TRow, unknown>;
}

/** Renders a single column header cell with sort and filter controls. */
export function ColumnHeaderCell<TRow>({ header }: ColumnHeaderCellProps<TRow>) {
  const strataColumn = header.column.columnDef.meta!.strataColumn;
  const width = header.getSize();
  const canSort = header.column.getCanSort();
  const sortDirection = header.column.getIsSorted();
  const filterType = strataColumn.filter as FilterType | false | undefined;

  const handleClick = (e: React.MouseEvent) => {
    if (!canSort) return;
    header.column.getToggleSortingHandler()?.(e);
  };

  return (
    <div
      className={`strata-header-cell${canSort ? ' strata-header-cell-sortable' : ''}`}
      role="columnheader"
      style={{ width }}
      onClick={handleClick}
      aria-sort={
        sortDirection === 'asc'
          ? 'ascending'
          : sortDirection === 'desc'
            ? 'descending'
            : undefined
      }
    >
      <span className="strata-header-label">
        {strataColumn.header}
      </span>
      {canSort && <SortIndicator direction={sortDirection} />}
      {!!filterType && (
        <FilterPopover column={header.column} filterType={filterType} />
      )}
    </div>
  );
}
