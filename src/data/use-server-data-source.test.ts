import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useServerDataSource } from './use-server-data-source';
import type { DataSource } from './data-source';
import type { ColumnSort } from '../model/types';
import type { FilterExpression } from './types';

interface Row {
  id: string;
  name: string;
}

const mockRows: Row[] = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
];

function createServerDS(loadFn?: DataSource<Row>['load']): DataSource<Row> {
  return {
    load: loadFn ?? vi.fn(() => Promise.resolve(mockRows)),
    capabilities: () => ({ serverSort: true, serverFilter: true }),
  };
}

describe('useServerDataSource — initial load', () => {
  it('loads data on mount', async () => {
    const ds = createServerDS();
    const { result } = renderHook(() => useServerDataSource(ds));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockRows);
  });

  it('shows loading state during initial load', () => {
    const ds = createServerDS(
      () => new Promise<Row[]>(() => {}), // never resolves
    );
    const { result } = renderHook(() => useServerDataSource(ds));
    expect(result.current.isLoading).toBe(true);
  });
});

describe('useServerDataSource — sort push-down', () => {
  it('reloads with sort query when sort changes', async () => {
    const loadFn = vi.fn(() => Promise.resolve(mockRows));
    const ds = createServerDS(loadFn);
    const { result } = renderHook(() => useServerDataSource(ds));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const sort: ColumnSort[] = [{ columnId: 'name', direction: 'asc' }];
    act(() => {
      result.current.setSort(sort);
    });

    await waitFor(() => {
      expect(loadFn).toHaveBeenCalledTimes(2);
    });

    expect(loadFn).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort }),
    );
  });
});

describe('useServerDataSource — filter push-down', () => {
  it('reloads with filter query when filters change', async () => {
    const loadFn = vi.fn(() => Promise.resolve(mockRows));
    const ds = createServerDS(loadFn);
    const { result } = renderHook(() => useServerDataSource(ds));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const filters: FilterExpression[] = [
      { columnId: 'name', operator: 'contains', value: 'Ali' },
    ];
    act(() => {
      result.current.setFilters(filters);
    });

    await waitFor(() => {
      expect(loadFn).toHaveBeenCalledTimes(2);
    });

    expect(loadFn).toHaveBeenLastCalledWith(
      expect.objectContaining({ filters }),
    );
  });
});

describe('useServerDataSource — error handling', () => {
  it('captures load errors', async () => {
    const error = new Error('Server error');
    const ds = createServerDS(() => Promise.reject(error));
    const { result } = renderHook(() => useServerDataSource(ds));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.data).toEqual([]);
  });
});

describe('useServerDataSource — abort on unmount', () => {
  it('does not update state after unmount', async () => {
    let resolveFn: (rows: Row[]) => void;
    const loadFn = vi.fn(
      () =>
        new Promise<Row[]>((resolve) => {
          resolveFn = resolve;
        }),
    );
    const ds = createServerDS(loadFn);
    const { result, unmount } = renderHook(() => useServerDataSource(ds));

    expect(result.current.isLoading).toBe(true);
    unmount();

    // Resolve after unmount — should not throw
    act(() => {
      resolveFn!(mockRows);
    });
  });
});
