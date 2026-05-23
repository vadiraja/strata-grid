import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ColumnDef } from './types';
import { buildBomRollupNodes, useBomRollup } from './use-bom-rollup';

interface Part {
  id: string;
  qty: number;
  children?: Part[];
}

const columns: ColumnDef<Part>[] = [
  { id: 'qty', header: 'Qty', accessor: 'qty' },
  { id: 'extQty', header: 'Ext Qty' },
];

const getRowId = (row: Part) => row.id;
const getSubRows = (row: Part) => row.children;

describe('buildBomRollupNodes', () => {
  it('builds generic roll-up nodes from grid rows', () => {
    const nodes = buildBomRollupNodes({
      roots: [{ id: 'root', qty: 2, children: [{ id: 'child', qty: 3 }] }],
      columns,
      sourceColumnId: 'qty',
      getRowId,
      getSubRows,
    });

    expect(nodes).toEqual([
      {
        id: 'root',
        qty: 2,
        children: [{ id: 'child', qty: 3, children: [] }],
      },
    ]);
  });
});

describe('useBomRollup', () => {
  it('computes extended quantities from tree data', () => {
    const { result } = renderHook(() =>
      useBomRollup({
        roots: [{ id: 'root', qty: 2, children: [{ id: 'child', qty: 3 }] }],
        columns,
        sourceColumnId: 'qty',
        targetColumnId: 'extQty',
        getRowId,
        getSubRows,
      }),
    );

    expect(result.current.targetColumnId).toBe('extQty');
    expect(result.current.extendedQuantities.get('root')).toBe(2);
    expect(result.current.extendedQuantities.get('child')).toBe(6);
  });

  it('recomputes when data changes', () => {
    const initialRows: Part[] = [
      { id: 'root', qty: 2, children: [{ id: 'child', qty: 3 }] },
    ];
    const updatedRows: Part[] = [
      { id: 'root', qty: 4, children: [{ id: 'child', qty: 3 }] },
    ];

    const { result, rerender } = renderHook(
      ({ roots }) =>
        useBomRollup({
          roots,
          columns,
          sourceColumnId: 'qty',
          targetColumnId: 'extQty',
          getRowId,
          getSubRows,
        }),
      { initialProps: { roots: initialRows } },
    );

    expect(result.current.extendedQuantities.get('child')).toBe(6);
    rerender({ roots: updatedRows });
    expect(result.current.extendedQuantities.get('child')).toBe(12);
  });
});
