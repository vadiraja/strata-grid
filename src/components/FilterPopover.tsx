import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Column } from '@tanstack/react-table';
import type { FilterOperator, ResolvedColumnFilter } from '../data/types';
import { StrataIcon } from '../icons';
import { SelectFilterInput } from './SelectFilterInput';
import { BooleanFilterInput } from './BooleanFilterInput';
import { DateFilterInput } from './DateFilterInput';

export interface FilterPopoverProps<TRow> {
  /** The TanStack column to filter. */
  column: Column<TRow, unknown>;
  /** Resolved filter configuration — determines input type and operators. */
  resolved: ResolvedColumnFilter;
}

/**
 * A per-column filter input popover. Renders a text or number input
 * that sets the column's filter value on change.
 */
interface StructuredFilterValue {
  operator: FilterOperator;
  value: unknown;
}

function readStructured(v: unknown): StructuredFilterValue | null {
  if (v && typeof v === 'object' && 'operator' in v) {
    return v as StructuredFilterValue;
  }
  return null;
}

function readTextValue(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw;
  const structured = readStructured(raw);
  if (structured) {
    return structured.value == null ? '' : String(structured.value);
  }
  return String(raw);
}

interface TextNumberInputProps<TRow> {
  column: Column<TRow, unknown>;
  resolved: Extract<ResolvedColumnFilter, { type: 'text' | 'number' }>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  filterValue: string;
  filterType: 'text' | 'number';
  onClear: () => void;
}

function TextNumberInput<TRow>({
  column,
  resolved,
  inputRef,
  filterValue,
  filterType,
  onClear,
}: TextNumberInputProps<TRow>) {
  const showOperatorSelect = resolved.operators.length > 1;
  const defaultOperator: FilterOperator =
    resolved.operators[0] ?? (filterType === 'number' ? 'equals' : 'contains');
  const current = readStructured(column.getFilterValue());
  const [operator, setOperator] = useState<FilterOperator>(
    current?.operator ?? defaultOperator,
  );

  const setValueFor = (op: FilterOperator, raw: string) => {
    if (raw === '') {
      column.setFilterValue(undefined);
      return;
    }
    if (showOperatorSelect) {
      // Emit structured so the operator round-trips through fromTanstackFilters.
      column.setFilterValue({ operator: op, value: raw });
    } else {
      // Single-operator default — preserve legacy primitive form for
      // backward compatibility (existing client-side filterFns use it).
      column.setFilterValue(raw);
    }
  };

  return (
    <>
      {showOperatorSelect && (
        <select
          className="strata-filter-operator"
          aria-label={`Filter ${column.id} operator`}
          value={operator}
          onChange={(e) => {
            const next = e.target.value as FilterOperator;
            setOperator(next);
            if (filterValue) setValueFor(next, filterValue);
          }}
        >
          {resolved.operators.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      )}
      <input
        ref={inputRef}
        className="strata-filter-input"
        type={filterType === 'number' ? 'number' : 'text'}
        placeholder={`Filter${filterType === 'number' ? ' (number)' : ''}…`}
        value={filterValue}
        onChange={(e) => setValueFor(operator, e.target.value)}
        aria-label={`Filter value for ${column.id}`}
      />
      {filterValue && (
        <button
          type="button"
          className="strata-filter-clear-button"
          aria-label={`Clear filter ${column.id}`}
          onClick={(event) => {
            event.stopPropagation();
            onClear();
          }}
        >
          ×
        </button>
      )}
    </>
  );
}

export function FilterPopover<TRow>({
  column,
  resolved,
}: FilterPopoverProps<TRow>) {
  const filterType: 'text' | 'number' =
    resolved.type === 'number' ? 'number' : 'text';
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [popoverPos, setPopoverPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const rawValue = column.getFilterValue();
  const filterValue = readTextValue(rawValue);
  const hasValue = filterValue !== '' || readStructured(rawValue) !== null;

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPopoverPos(null);
      setPortalTarget(null);
      return undefined;
    }
    const grid =
      (buttonRef.current?.closest('.strata-grid') as HTMLElement | null) ??
      document.body;
    setPortalTarget(grid);
    const updatePosition = () => {
      const btn = buttonRef.current?.getBoundingClientRect();
      const base = grid.getBoundingClientRect();
      if (!btn) return;
      setPopoverPos({
        top: btn.bottom - base.top + 4,
        left: btn.left - base.left,
      });
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node) {
        if (wrapperRef.current?.contains(target)) return;
        if (popoverRef.current?.contains(target)) return;
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
        if (nextFocus instanceof Node) {
          if (wrapperRef.current?.contains(nextFocus)) return;
          if (popoverRef.current?.contains(nextFocus)) return;
        }
        setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="strata-filter-button"
        aria-label={`Filter ${column.id}`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        {hasValue ? <StrataIcon name="filter-active" /> : <StrataIcon name="filter" />}
      </button>
      {open && popoverPos && portalTarget && createPortal(
        <div
          ref={popoverRef}
          className="strata-filter-popover"
          role="dialog"
          aria-label="Column filter"
          style={{ top: popoverPos.top, left: popoverPos.left }}
          onClick={(event) => event.stopPropagation()}
        >
          {resolved.type === 'select' ? (
            <SelectFilterInput
              column={column}
              options={resolved.options}
              multi={resolved.multi}
              operators={resolved.operators}
            />
          ) : resolved.type === 'boolean' ? (
            <BooleanFilterInput column={column} />
          ) : resolved.type === 'date' ? (
            <DateFilterInput
              column={column}
              operators={resolved.operators}
              range={resolved.range}
            />
          ) : (
            <TextNumberInput
              column={column}
              resolved={resolved}
              inputRef={inputRef}
              filterValue={filterValue}
              filterType={filterType}
              onClear={clearFilter}
            />
          )}
        </div>,
        portalTarget,
      )}
    </span>
  );
}
