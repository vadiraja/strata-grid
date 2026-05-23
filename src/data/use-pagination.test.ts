import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePagination } from './use-pagination';
import type { DataSource } from './data-source';
import type { PageResult } from './types';

interface Row { id: string; name: string }

const page1: PageResult<Row> = {
  rows: [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }],
  totalCount: 6,
  hasMore: true,
};

const page2: PageResult<Row> = {
  rows: [{ id: '3', name: 'Charlie' }, { id: '4', name: 'Dave' }],
  totalCount: 6,
  hasMore: true,
};

const page3: PageResult<Row> = {
  rows: [{ id: '5', name: 'Eve' }, { id: '6', name: 'Frank' }],
  totalCount: 6,
  hasMore: false,
};

function createPagedDS(loadPageFn?: DataSource<Row>['loadPage']): DataSource<Row> {
  return {
    load: () => [],
    loadPage: loadPageFn ?? vi.fn((params) => {
      const offset = typeof params.offset === 'number' ? params.offset : 0;
      if (offset === 0) return Promise.resolve(page1);
      if (offset === 2) return Promise.resolve(page2);
      return Promise.resolve(page3);
    }),
    capabilities: () => ({ pagination: true }),
  };
}

describe('usePagination — initial state', () => {
  it('loads the first page on mount', async () => {
    const ds = createPagedDS();
    const { result } = renderHook(() => usePagination(ds, { pageSize: 2 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(page1.rows);
    expect(result.current.currentPage).toBe(0);
    expect(result.current.totalCount).toBe(6);
    expect(result.current.totalPages).toBe(3);
  });
});

describe('usePagination — goToPage', () => {
  it('loads the requested page', async () => {
    const ds = createPagedDS();
    const { result } = renderHook(() => usePagination(ds, { pageSize: 2 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.goToPage(1);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(page2.rows);
    expect(result.current.currentPage).toBe(1);
  });

  it('clamps page to valid range', async () => {
    const ds = createPagedDS();
    const { result } = renderHook(() => usePagination(ds, { pageSize: 2 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.goToPage(99);
    });

    await waitFor(() => {
      expect(result.current.currentPage).toBe(2); // last page
    });
  });

  it('does not go below page 0', async () => {
    const ds = createPagedDS();
    const { result } = renderHook(() => usePagination(ds, { pageSize: 2 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.goToPage(-1);
    });

    expect(result.current.currentPage).toBe(0);
  });
});

describe('usePagination — setPageSize', () => {
  it('resets to page 0 and reloads', async () => {
    const loadPageFn = vi.fn(() => Promise.resolve(page1));
    const ds = createPagedDS(loadPageFn);
    const { result } = renderHook(() => usePagination(ds, { pageSize: 2 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setPageSize(10);
    });

    await waitFor(() => {
      expect(loadPageFn).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 0, limit: 10 }),
      );
    });

    expect(result.current.currentPage).toBe(0);
    expect(result.current.pageSize).toBe(10);
  });
});

describe('usePagination — loadMore mode', () => {
  it('appends rows instead of replacing', async () => {
    const ds = createPagedDS();
    const { result } = renderHook(() =>
      usePagination(ds, { pageSize: 2, mode: 'loadMore' }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(page1.rows);

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(4);
    });

    expect(result.current.data).toEqual([...page1.rows, ...page2.rows]);
    expect(result.current.hasMore).toBe(true);
  });
});

describe('usePagination — error handling', () => {
  it('captures page load errors', async () => {
    const error = new Error('Page load failed');
    const ds = createPagedDS(() => Promise.reject(error));
    const { result } = renderHook(() => usePagination(ds, { pageSize: 2 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(error);
  });
});
