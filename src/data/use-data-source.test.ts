import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDataSource } from './use-data-source';
import type { DataSource } from './data-source';
import type { DataSourceCapabilities, DataQuery } from './types';

interface Row {
  id: string;
  name: string;
}

function createMockDataSource(
  overrides: Partial<DataSource<Row>> = {},
): DataSource<Row> {
  return {
    load: vi.fn(() => [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ]),
    ...overrides,
  };
}

function createServerDataSource(
  caps: DataSourceCapabilities,
  overrides: Partial<DataSource<Row>> = {},
): DataSource<Row> {
  return {
    load: vi.fn(() =>
      Promise.resolve([
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ]),
    ),
    capabilities: () => caps,
    ...overrides,
  };
}

describe('useDataSource — capability detection', () => {
  it('detects no capabilities when capabilities() is not defined', () => {
    const ds = createMockDataSource();
    const { result } = renderHook(() => useDataSource(ds));
    expect(result.current.capabilities).toEqual({});
  });

  it('detects server-side capabilities', () => {
    const caps: DataSourceCapabilities = {
      serverSort: true,
      serverFilter: true,
      lazyChildren: true,
    };
    const ds = createServerDataSource(caps);
    const { result } = renderHook(() => useDataSource(ds));
    expect(result.current.capabilities).toEqual(caps);
  });
});

describe('useDataSource — loading', () => {
  it('loads data synchronously from InMemoryDataSource', () => {
    const ds = createMockDataSource();
    const { result } = renderHook(() => useDataSource(ds));
    expect(result.current.data).toEqual([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ]);
    expect(result.current.loadingState.isLoading).toBe(false);
  });

  it('loads data asynchronously from server data source', async () => {
    const ds = createServerDataSource({ serverSort: true });
    const { result } = renderHook(() => useDataSource(ds));

    // Initially loading
    expect(result.current.loadingState.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.loadingState.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ]);
  });

  it('handles load errors gracefully', async () => {
    const error = new Error('Network failure');
    const ds = createServerDataSource(
      { serverSort: true },
      { load: vi.fn(() => Promise.reject(error)) },
    );
    const { result } = renderHook(() => useDataSource(ds));

    await waitFor(() => {
      expect(result.current.loadingState.isLoading).toBe(false);
    });

    expect(result.current.loadingState.error).toBe(error);
    expect(result.current.data).toEqual([]);
  });
});

describe('useDataSource — reload with query', () => {
  it('reloads data when query changes', async () => {
    const loadFn = vi.fn(() =>
      Promise.resolve([{ id: '1', name: 'Alice' }]),
    );
    const ds = createServerDataSource(
      { serverSort: true },
      { load: loadFn },
    );
    const { result } = renderHook(
      ({ query }) => useDataSource(ds, query),
      { initialProps: { query: undefined as DataQuery | undefined } },
    );

    await waitFor(() => {
      expect(result.current.loadingState.isLoading).toBe(false);
    });

    expect(loadFn).toHaveBeenCalledTimes(1);

    // Trigger reload with a query
    act(() => {
      result.current.reload({ sort: [{ columnId: 'name', direction: 'asc' }] });
    });

    await waitFor(() => {
      expect(loadFn).toHaveBeenCalledTimes(2);
    });

    expect(loadFn).toHaveBeenLastCalledWith({
      sort: [{ columnId: 'name', direction: 'asc' }],
    });
  });
});

describe('useDataSource — refresh', () => {
  it('refresh re-calls load with the last query', async () => {
    const loadFn = vi.fn(() =>
      Promise.resolve([{ id: '1', name: 'Alice' }]),
    );
    const ds = createServerDataSource({ serverSort: true }, { load: loadFn });
    const { result } = renderHook(() => useDataSource(ds));

    await waitFor(() => {
      expect(result.current.loadingState.isLoading).toBe(false);
    });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(loadFn).toHaveBeenCalledTimes(2);
    });
  });
});
