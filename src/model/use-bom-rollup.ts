import { useMemo } from 'react';
import type { ColumnDef } from './types';
import type { BomRollupCompute, BomRollupNode } from './bom-rollup';
import { computeExtendedQuantity } from './bom-rollup';
import { readValue } from './read-value';

export interface UseBomRollupOptions<TRow> {
  roots: TRow[];
  columns: ColumnDef<TRow>[];
  sourceColumnId?: string;
  targetColumnId?: string;
  getRowId?: (row: TRow) => string;
  getSubRows?: (row: TRow) => TRow[] | undefined;
  compute?: BomRollupCompute;
}

export interface UseBomRollupReturn {
  targetColumnId?: string;
  extendedQuantities: Map<string, number>;
}

export function buildBomRollupNodes<TRow>({
  roots,
  columns,
  sourceColumnId,
  getRowId,
  getSubRows,
}: Pick<
  UseBomRollupOptions<TRow>,
  'roots' | 'columns' | 'sourceColumnId' | 'getRowId' | 'getSubRows'
>): BomRollupNode[] {
  if (!sourceColumnId || !getRowId || !getSubRows) return [];

  const sourceColumn = columns.find((column) => column.id === sourceColumnId);
  if (!sourceColumn) return [];

  const visit = (row: TRow): BomRollupNode => ({
    id: getRowId(row),
    qty: readValue(sourceColumn, row),
    children: (getSubRows(row) ?? []).map(visit),
  });

  return roots.map(visit);
}

export function useBomRollup<TRow>({
  roots,
  columns,
  sourceColumnId,
  targetColumnId,
  getRowId,
  getSubRows,
  compute = 'multiply-down',
}: UseBomRollupOptions<TRow>): UseBomRollupReturn {
  return useMemo(() => {
    const nodes = buildBomRollupNodes({
      roots,
      columns,
      sourceColumnId,
      getRowId,
      getSubRows,
    });

    if (!targetColumnId || nodes.length === 0) {
      return { targetColumnId, extendedQuantities: new Map<string, number>() };
    }

    return {
      targetColumnId,
      extendedQuantities: computeExtendedQuantity(nodes, compute)
        .extendedQuantities,
    };
  }, [
    roots,
    columns,
    sourceColumnId,
    targetColumnId,
    getRowId,
    getSubRows,
    compute,
  ]);
}
