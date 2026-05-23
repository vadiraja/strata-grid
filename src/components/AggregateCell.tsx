import type { ColumnDef } from '../model/types';

export interface AggregateCellProps<TRow> {
  column: ColumnDef<TRow>;
  value: unknown;
}

function defaultFormat(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value);
}

/** Renders a compact aggregate label/value pair. */
export function AggregateCell<TRow>({
  column,
  value,
}: AggregateCellProps<TRow>) {
  const content = column.aggregateFormatter
    ? column.aggregateFormatter(value)
    : defaultFormat(value);

  return (
    <span className="strata-aggregate-cell" data-column-id={column.id}>
      <span className="strata-aggregate-label">{column.header}</span>
      <span className="strata-aggregate-value">{content}</span>
    </span>
  );
}
