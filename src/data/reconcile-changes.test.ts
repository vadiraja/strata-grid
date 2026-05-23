import { describe, it, expect } from 'vitest';
import { reconcileChanges } from './reconcile-changes';
import type { DataChangeEvent } from './types';

interface Row { id: string; name: string; parentId: string | null }

const baseRows: Row[] = [
  { id: '1', name: 'Alice', parentId: null },
  { id: '2', name: 'Bob', parentId: null },
  { id: '3', name: 'Charlie', parentId: '1' },
];

const getRowId = (r: Row) => r.id;
const getParentId = (r: Row) => r.parentId;

describe('reconcileChanges — add', () => {
  it('adds new rows to the end', () => {
    const event: DataChangeEvent<Row> = {
      type: 'add',
      rows: [{ id: '4', data: { id: '4', name: 'Dave', parentId: null } }],
    };
    const result = reconcileChanges(baseRows, event, getRowId);
    expect(result).toHaveLength(4);
    expect(result![3]).toEqual({ id: '4', name: 'Dave', parentId: null });
  });

  it('adds child rows under parent', () => {
    const event: DataChangeEvent<Row> = {
      type: 'add',
      rows: [{ id: '5', data: { id: '5', name: 'Eve', parentId: '1' }, parentId: '1' }],
    };
    const result = reconcileChanges(baseRows, event, getRowId);
    expect(result).toHaveLength(4);
    expect(result!.find((r) => r.id === '5')?.parentId).toBe('1');
  });
});

describe('reconcileChanges — update', () => {
  it('patches existing row data', () => {
    const event: DataChangeEvent<Row> = {
      type: 'update',
      rows: [{ id: '1', data: { id: '1', name: 'Alice Updated', parentId: null } }],
    };
    const result = reconcileChanges(baseRows, event, getRowId);
    expect(result).toHaveLength(3);
    expect(result!.find((r) => r.id === '1')?.name).toBe('Alice Updated');
  });

  it('ignores updates for non-existent rows', () => {
    const event: DataChangeEvent<Row> = {
      type: 'update',
      rows: [{ id: '99', data: { id: '99', name: 'Ghost', parentId: null } }],
    };
    const result = reconcileChanges(baseRows, event, getRowId);
    expect(result).toEqual(baseRows);
  });
});

describe('reconcileChanges — delete', () => {
  it('removes the specified row', () => {
    const event: DataChangeEvent<Row> = {
      type: 'delete',
      rows: [{ id: '2' }],
    };
    const result = reconcileChanges(baseRows, event, getRowId);
    expect(result).toHaveLength(2);
    expect(result!.find((r) => r.id === '2')).toBeUndefined();
  });

  it('removes a parent and its children', () => {
    const event: DataChangeEvent<Row> = {
      type: 'delete',
      rows: [{ id: '1' }],
    };
    const result = reconcileChanges(baseRows, event, getRowId, getParentId);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe('2');
    // Child '3' (parentId: '1') should also be removed
  });
});

describe('reconcileChanges — refresh', () => {
  it('returns null to signal a full reload is needed', () => {
    const event: DataChangeEvent<Row> = { type: 'refresh' };
    const result = reconcileChanges(baseRows, event, getRowId);
    expect(result).toBeNull();
  });
});
