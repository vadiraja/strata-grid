import { useId } from 'react';
import type { Column } from '@tanstack/react-table';
import type { FilterOperator, SelectOption } from '../data/types';

export interface SelectFilterInputProps<TRow> {
  column: Column<TRow, unknown>;
  options: SelectOption[];
  multi: boolean;
  operators: FilterOperator[];
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
 * Renders a single-select dropdown or a multi-select checkbox list for
 * enum-style columns. Emits a structured `{ operator, value }` filter
 * value so the operator is explicit when the grid serializes to a server
 * query.
 *
 * Defaults:
 * - Single-select operator: first entry in `operators` (typically `equals`)
 * - Multi-select operator: first entry in `operators` (typically `in`)
 */
export function SelectFilterInput<TRow>({
  column,
  options,
  multi,
  operators,
}: SelectFilterInputProps<TRow>) {
  const labelId = useId();
  const current = readStructured(column.getFilterValue());
  const defaultOperator: FilterOperator = operators[0] ?? (multi ? 'in' : 'equals');

  if (multi) {
    const currentValues: unknown[] = Array.isArray(current?.value)
      ? (current!.value as unknown[])
      : [];

    const toggle = (optionValue: unknown) => {
      const next = currentValues.includes(optionValue)
        ? currentValues.filter((v) => v !== optionValue)
        : [...currentValues, optionValue];
      if (next.length === 0) {
        column.setFilterValue(undefined);
      } else {
        column.setFilterValue({ operator: defaultOperator, value: next });
      }
    };

    return (
      <div className="strata-filter-select" role="group" aria-labelledby={labelId}>
        <div id={labelId} className="strata-filter-select-label">
          {currentValues.length === 0
            ? 'Any'
            : `${currentValues.length} selected`}
        </div>
        <ul className="strata-filter-select-options">
          {options.map((opt) => {
            const optionKey = String(opt.value);
            const checked = currentValues.includes(opt.value);
            return (
              <li key={optionKey}>
                <label className="strata-filter-select-option">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {currentValues.length > 0 && (
          <button
            type="button"
            className="strata-filter-clear-button"
            onClick={() => column.setFilterValue(undefined)}
          >
            Clear
          </button>
        )}
      </div>
    );
  }

  // Single-select
  const currentValue =
    current && !Array.isArray(current.value) ? current.value : '';

  return (
    <div className="strata-filter-select">
      <select
        className="strata-filter-input"
        aria-label={`Filter ${column.id}`}
        value={currentValue === '' || currentValue == null ? '' : String(currentValue)}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '') {
            column.setFilterValue(undefined);
            return;
          }
          const matched = options.find((o) => String(o.value) === v);
          column.setFilterValue({
            operator: defaultOperator,
            value: matched ? matched.value : v,
          });
        }}
      >
        <option value="">Any</option>
        {options.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
