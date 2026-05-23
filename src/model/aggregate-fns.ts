import type { Row } from '@tanstack/react-table';
import type { AggregateType } from './types';

export type AggregateFn = (values: unknown[]) => unknown;

function toNumbers(values: unknown[]): number[] {
  return values
    .filter((value) => value !== null && value !== undefined)
    .map((value) => (typeof value === 'number' ? value : Number(value)))
    .filter((value) => Number.isFinite(value));
}

export const aggregateFns: Record<AggregateType, AggregateFn> = {
  sum(values) {
    return toNumbers(values).reduce((total, value) => total + value, 0);
  },
  avg(values) {
    const numbers = toNumbers(values);
    if (numbers.length === 0) return null;
    return numbers.reduce((total, value) => total + value, 0) / numbers.length;
  },
  min(values) {
    const numbers = toNumbers(values);
    if (numbers.length === 0) return null;
    return Math.min(...numbers);
  },
  max(values) {
    const numbers = toNumbers(values);
    if (numbers.length === 0) return null;
    return Math.max(...numbers);
  },
  count(values) {
    return values.length;
  },
};

export function aggregateValues(
  aggregate: AggregateType | AggregateFn,
  values: unknown[],
): unknown {
  if (typeof aggregate === 'function') {
    return aggregate(values);
  }
  return aggregateFns[aggregate](values);
}

export function toTanstackAggregationFn<TRow>(
  aggregate: AggregateType | AggregateFn,
) {
  return (columnId: string, leafRows: Row<TRow>[]) =>
    aggregateValues(
      aggregate,
      leafRows.map((row) => row.getValue(columnId)),
    );
}
