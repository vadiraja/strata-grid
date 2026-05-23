import type { Column } from '@tanstack/react-table';

export interface BooleanFilterInputProps<TRow> {
  column: Column<TRow, unknown>;
}

interface StructuredFilterValue {
  operator: 'equals';
  value: boolean;
}

function readBool(v: unknown): boolean | null {
  if (v && typeof v === 'object' && 'value' in v) {
    const val = (v as { value: unknown }).value;
    if (typeof val === 'boolean') return val;
  }
  return null;
}

/**
 * Tri-state boolean filter: Yes / No / Any. Emits
 * `{ operator: 'equals', value: true | false }` or clears the filter.
 */
export function BooleanFilterInput<TRow>({
  column,
}: BooleanFilterInputProps<TRow>) {
  const current = readBool(column.getFilterValue());

  const set = (value: boolean | null) => {
    if (value === null) {
      column.setFilterValue(undefined);
    } else {
      const sv: StructuredFilterValue = { operator: 'equals', value };
      column.setFilterValue(sv);
    }
  };

  const name = `strata-filter-bool-${column.id}`;

  return (
    <div
      className="strata-filter-boolean"
      role="radiogroup"
      aria-label={`Filter ${column.id}`}
    >
      <label className="strata-filter-boolean-option">
        <input
          type="radio"
          name={name}
          checked={current === null}
          onChange={() => set(null)}
        />
        <span>Any</span>
      </label>
      <label className="strata-filter-boolean-option">
        <input
          type="radio"
          name={name}
          checked={current === true}
          onChange={() => set(true)}
        />
        <span>Yes</span>
      </label>
      <label className="strata-filter-boolean-option">
        <input
          type="radio"
          name={name}
          checked={current === false}
          onChange={() => set(false)}
        />
        <span>No</span>
      </label>
    </div>
  );
}
