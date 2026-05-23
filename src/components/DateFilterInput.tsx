import { useState } from 'react';
import type { Column } from '@tanstack/react-table';
import type { FilterOperator } from '../data/types';

export interface DateFilterInputProps<TRow> {
  column: Column<TRow, unknown>;
  operators: FilterOperator[];
  range: boolean;
}

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

/**
 * Date filter with optional range mode. Values are ISO date strings
 * (`YYYY-MM-DD`).
 *
 * - Single mode: emits `{ operator, value }` with the chosen operator
 *   (default: first in `operators`, typically `equals`).
 * - Range mode: emits `{ operator: 'between', value: [from, to] }`.
 *   Both from and to required before a filter is emitted.
 */
export function DateFilterInput<TRow>({
  column,
  operators,
  range,
}: DateFilterInputProps<TRow>) {
  const current = readStructured(column.getFilterValue());
  const defaultOperator: FilterOperator = operators[0] ?? (range ? 'between' : 'equals');

  if (range) {
    return (
      <RangeMode
        column={column}
        initial={Array.isArray(current?.value) ? (current!.value as [unknown, unknown]) : [undefined, undefined]}
      />
    );
  }

  // Single-date mode
  const valueStr = typeof current?.value === 'string' ? current.value : '';
  const [operator, setOperator] = useState<FilterOperator>(
    current?.operator ?? defaultOperator,
  );

  const set = (nextOperator: FilterOperator, nextValue: string) => {
    if (!nextValue) {
      column.setFilterValue(undefined);
      return;
    }
    column.setFilterValue({ operator: nextOperator, value: nextValue });
  };

  const showOperatorSelect = operators.length > 1;

  return (
    <div className="strata-filter-date">
      {showOperatorSelect && (
        <select
          className="strata-filter-operator"
          aria-label={`Filter ${column.id} operator`}
          value={operator}
          onChange={(e) => {
            const next = e.target.value as FilterOperator;
            setOperator(next);
            if (valueStr) set(next, valueStr);
          }}
        >
          {operators.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      )}
      <input
        type="date"
        className="strata-filter-input"
        value={valueStr}
        onChange={(e) => set(operator, e.target.value)}
        aria-label={`Filter ${column.id}`}
      />
    </div>
  );
}

interface RangeModeProps<TRow> {
  column: Column<TRow, unknown>;
  initial: [unknown, unknown];
}

function RangeMode<TRow>({ column, initial }: RangeModeProps<TRow>) {
  const [fromStr, setFromStr] = useState<string>(
    typeof initial[0] === 'string' ? initial[0] : '',
  );
  const [toStr, setToStr] = useState<string>(
    typeof initial[1] === 'string' ? initial[1] : '',
  );

  const onChange = (nextFrom: string, nextTo: string) => {
    setFromStr(nextFrom);
    setToStr(nextTo);
    if (!nextFrom && !nextTo) {
      column.setFilterValue(undefined);
      return;
    }
    if (!nextFrom || !nextTo) {
      // Partial range — keep local state; the previous emitted filter (if any)
      // stays until both fields are set or both are cleared.
      return;
    }
    column.setFilterValue({
      operator: 'between',
      value: [nextFrom, nextTo],
    });
  };

  return (
    <div className="strata-filter-date-range">
      <label className="strata-filter-date-label">
        <span>From</span>
        <input
          type="date"
          className="strata-filter-input"
          value={fromStr}
          onChange={(e) => onChange(e.target.value, toStr)}
          aria-label={`Filter ${column.id} from`}
        />
      </label>
      <label className="strata-filter-date-label">
        <span>To</span>
        <input
          type="date"
          className="strata-filter-input"
          value={toStr}
          onChange={(e) => onChange(fromStr, e.target.value)}
          aria-label={`Filter ${column.id} to`}
        />
      </label>
      {(fromStr || toStr) && (
        <button
          type="button"
          className="strata-filter-clear-button"
          onClick={() => {
            setFromStr('');
            setToStr('');
            column.setFilterValue(undefined);
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
