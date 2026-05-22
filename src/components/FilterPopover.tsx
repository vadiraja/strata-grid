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
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filterValue = (column.getFilterValue() as string) ?? '';

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        wrapperRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const clearFilter = () => {
    column.setFilterValue(undefined);
    setOpen(false);
  };

  return (
    <span
      className="strata-filter-wrapper"
      ref={wrapperRef}
      onBlurCapture={(event) => {
        const nextFocus = event.relatedTarget;
        if (
          nextFocus instanceof Node &&
          wrapperRef.current?.contains(nextFocus)
        ) {
          return;
        }
        setOpen(false);
      }}
    >
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
        <div
          className="strata-filter-popover"
          role="dialog"
          aria-label="Column filter"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            ref={inputRef}
            className="strata-filter-input"
            type={filterType === 'number' ? 'number' : 'text'}
            placeholder={`Filter${filterType === 'number' ? ' (number)' : ''}…`}
            value={filterValue}
            onChange={(e) => column.setFilterValue(e.target.value || undefined)}
            aria-label={`Filter value for ${column.id}`}
          />
          {filterValue && (
            <button
              type="button"
              className="strata-filter-clear-button"
              aria-label={`Clear filter ${column.id}`}
              onClick={(event) => {
                event.stopPropagation();
                clearFilter();
              }}
            >
              ×
            </button>
          )}
        </div>
      )}
    </span>
  );
}
