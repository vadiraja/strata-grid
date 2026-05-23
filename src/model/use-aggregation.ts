import { useMemo } from 'react';
import type { Row, Table } from '@tanstack/react-table';
import type { ColumnDef } from './types';
import { aggregateValues } from './aggregate-fns';

export type AggregateMap = Map<string, unknown>;

export interface UseAggregationOptions<TRow> {
  table: Table<TRow>;
  columns: ColumnDef<TRow>[];
  showFooterAggregates?: boolean;
}

export interface UseAggregationReturn<TRow> {
  aggregateColumns: ColumnDef<TRow>[];
  footerAggregates: AggregateMap;
  getGroupAggregates: (row: Row<TRow>) => AggregateMap;
}

function uniqueRows<TRow>(rows: Row<TRow>[]): Row<TRow>[] {
  const seen = new Set<string>();
  const result: Row<TRow>[] = [];

  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    result.push(row);
  }

  return result;
}

function collectVisibleLeafRows<TRow>(rows: Row<TRow>[]): Row<TRow>[] {
  const leaves: Row<TRow>[] = [];

  for (const row of rows) {
    if (row.getIsGrouped()) {
      leaves.push(...row.getLeafRows());
    } else {
      leaves.push(row);
    }
  }

  return uniqueRows(leaves);
}

export function computeAggregates<TRow>(
  rows: Row<TRow>[],
  columns: ColumnDef<TRow>[],
): AggregateMap {
  const aggregateMap: AggregateMap = new Map();

  for (const column of columns) {
    if (!column.aggregate) continue;
    aggregateMap.set(
      column.id,
      aggregateValues(
        column.aggregate,
        rows.map((row) => row.getValue(column.id)),
      ),
    );
  }

  return aggregateMap;
}

export function useAggregation<TRow>({
  table,
  columns,
  showFooterAggregates = false,
}: UseAggregationOptions<TRow>): UseAggregationReturn<TRow> {
  const rowModelRows = table.getRowModel().rows;
  const aggregateColumns = useMemo(
    () => columns.filter((column) => column.aggregate),
    [columns],
  );

  const footerAggregates = useMemo(() => {
    if (!showFooterAggregates) return new Map<string, unknown>();
    return computeAggregates(
      collectVisibleLeafRows(rowModelRows),
      aggregateColumns,
    );
  }, [aggregateColumns, rowModelRows, showFooterAggregates]);

  return {
    aggregateColumns,
    footerAggregates,
    getGroupAggregates: (row) =>
      computeAggregates(row.getLeafRows(), aggregateColumns),
  };
}
