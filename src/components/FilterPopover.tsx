import { useState, useRef, useEffect } from 'react';
import type { Column } from '@tanstack/react-table';
import type { FilterType } from '../model/types';

export interface FilterPopoverProps<TRow> {
  /** The TanStack column to filter. */
  column: Column<TRow, unknown>;
  /** The filter type — determines input type. */
  filterType: FilterType;
}

/**
 * A per-column filter input popover. Renders a text or number input
 * that sets the column's filter value on change.
 */
export function FilterPopover<TRow>({
  column,
  filterType,
}: FilterPopoverProps<TRow>) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const filterValue = (column.getFilterValue() as string) ?? '';

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  return (
    <span className="strata-filter-wrapper">
      <button
        type="button"
        className="strata-filter-button"
        aria-label={`Filter ${column.id}`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        {filterValue ? '⏚' : '▽'}
      </button>
      {open && (
        <div className="strata-filter-popover" role="dialog" aria-label="Column filter">
          <input
            ref={inputRef}
            className="strata-filter-input"
            type={filterType === 'number' ? 'number' : 'text'}
            placeholder={`Filter${filterType === 'number' ? ' (number)' : ''}…`}
            value={filterValue}
            onChange={(e) => column.setFilterValue(e.target.value || undefined)}
            aria-label={`Filter value for ${column.id}`}
          />
        </div>
      )}
    </span>
  );
}
