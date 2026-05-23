import type { ColumnDef as TanstackColumnDef } from '@tanstack/react-table';
import type { AnyColumn, ColumnDef, ColumnGroup } from './types';
import { isColumnGroup } from './types';
import { readValue } from './read-value';
import { DEFAULT_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from './constants';
import { textFilterFn, numberFilterFn } from './tree-filter-fn';
import { toTanstackAggregationFn } from './aggregate-fns';
import { resolveFilterConfig } from '../data/resolve-filter-config';
import type { ColumnFilterConfig } from '../data/types';

function resolveFilterFn(filterConfig: ColumnFilterConfig | false | undefined) {
  if (filterConfig === false || filterConfig === undefined) return undefined;

  const resolved = resolveFilterConfig(filterConfig);
  if (resolved.type === 'text') {
    return (row: any, columnId: string, filterValue: string) =>
      textFilterFn(row.getValue(columnId), filterValue);
  }
  if (resolved.type === 'number') {
    return (row: any, columnId: string, filterValue: string) =>
      numberFilterFn(row.getValue(columnId), filterValue);
  }
  // select / boolean / date — UI lands in 0.2.0 follow-up tasks.
  // For now, no client-side filterFn (server-driven assumed).
  return undefined;
}

function toTanstackLeaf<TRow>(
  column: ColumnDef<TRow>,
): TanstackColumnDef<TRow> {
  return {
    id: column.id,
    accessorFn: (row: TRow) => readValue(column, row),
    size: column.width ?? DEFAULT_COLUMN_WIDTH,
    minSize: column.minWidth ?? MIN_COLUMN_WIDTH,
    meta: { strataColumn: column },
    enableSorting: column.sortable !== false,
    enableColumnFilter: column.filter !== false && column.filter !== undefined,
    filterFn: resolveFilterFn(column.filter),
    enablePinning: true,
    enableGrouping: true,
    aggregationFn: column.aggregate
      ? toTanstackAggregationFn(column.aggregate)
      : undefined,
  };
}

function toTanstackGroup<TRow>(
  group: ColumnGroup<TRow>,
): TanstackColumnDef<TRow> {
  return {
    id: group.groupId,
    header: group.header as any,
    columns: group.columns.map((child) =>
      isColumnGroup(child) ? toTanstackGroup(child) : toTanstackLeaf(child),
    ),
  };
}

/** Converts public Strata columns/groups into TanStack column definitions. */
export function normalizeColumns<TRow>(
  columns: AnyColumn<TRow>[],
): TanstackColumnDef<TRow>[] {
  return columns.map((column) =>
    isColumnGroup(column) ? toTanstackGroup(column) : toTanstackLeaf(column),
  );
}

/** Returns all leaf columns in public order, flattening nested groups. */
export function getLeafColumns<TRow>(
  columns: AnyColumn<TRow>[],
): ColumnDef<TRow>[] {
  const leaves: ColumnDef<TRow>[] = [];

  for (const column of columns) {
    if (isColumnGroup(column)) {
      leaves.push(...getLeafColumns(column.columns));
    } else {
      leaves.push(column);
    }
  }

  return leaves;
}
