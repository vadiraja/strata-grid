import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWhereUsed } from './use-where-used';
import type { DataSource } from './data-source';
import type { WhereUsedResult } from './types';

interface Row { id: string; name: string; parentId: string | null }

const mockResults: WhereUsedResult<Row>[] = [
  {
    parentNode: { id: 'A', name: 'Assembly A', parentId: null },
    path: [{ id: 'A', name: 'Assembly A', parentId: null }],
  },
];

describe('useWhereUsed — server-side', () => {
  it('calls dataSource.whereUsed when available', async () => {
    const whereUsedFn = vi.fn(() => Promise.resolve(mockResults));
    const ds: DataSource<Row> = {
      load: () => [],
      whereUsed: whereUsedFn,
      capabilities: () => ({ whereUsed: true }),
    };

    const { result } = renderHook(() => useWhereUsed(ds, [], (r) => r.id, (r) => r.parentId));

    act(() => {
      result.current.query('D');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(whereUsedFn).toHaveBeenCalledWith('D');
    expect(result.current.results).toEqual(mockResults);
  });
});

describe('useWhereUsed — in-memory fallback', () => {
  it('uses in-memory traversal when dataSource.whereUsed is not available', async () => {
    const rows: Row[] = [
      { id: 'A', name: 'Assembly A', parentId: null },
      { id: 'B', name: 'Component B', parentId: 'A' },
    ];
    const ds: DataSource<Row> = { load: () => rows };

    const { result } = renderHook(() =>
      useWhereUsed(ds, rows, (r) => r.id, (r) => r.parentId),
    );

    act(() => {
      result.current.query('B');
    });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].parentNode.id).toBe('A');
  });
});

describe('useWhereUsed — error handling', () => {
  it('captures errors from server', async () => {
    const ds: DataSource<Row> = {
      load: () => [],
      whereUsed: () => Promise.reject(new Error('Not found')),
      capabilities: () => ({ whereUsed: true }),
    };

    const { result } = renderHook(() => useWhereUsed(ds, [], (r) => r.id, (r) => r.parentId));

    act(() => {
      result.current.query('X');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe('Not found');
  });
});
