import { useState, useCallback, useEffect, useRef } from 'react';
import type { DataSource } from './data-source';
import type { DataQuery, PageParams } from './types';

export interface UsePaginationOptions {
  /** Rows per page. Default: 50. */
  pageSize?: number;
  /** Pagination mode. Default: 'pages'. */
  mode?: 'pages' | 'loadMore' | 'infinite';
  /** Initial query for sort/filter. */
  query?: DataQuery;
}

export interface UsePaginationReturn<TRow> {
  /** Current page data. */
  data: TRow[];
  /** Whether a page is loading. */
  isLoading: boolean;
  /** Error from the last page load. */
  error: Error | null;
  /** Current page index (0-based). */
  currentPage: number;
  /** Current page size. */
  pageSize: number;
  /** Total row count from the server. */
  totalCount: number;
  /** Total number of pages. */
  totalPages: number;
  /** Whether more data is available (loadMore/infinite modes). */
  hasMore: boolean;
  /** Navigate to a specific page. */
  goToPage: (page: number) => void;
  /** Change the page size (resets to page 0). */
  setPageSize: (size: number) => void;
  /** Load the next page and append (loadMore/infinite modes). */
  loadMore: () => void;
  /** Refresh the current page. */
  refresh: () => void;
}

/**
 * Hook managing paginated data loading.
 *
 * Supports three modes:
 * - 'pages': traditional page navigation (replaces data on page change)
 * - 'loadMore': append button (accumulates data)
 * - 'infinite': scroll-triggered append (accumulates data)
 */
export function usePagination<TRow>(
  dataSource: DataSource<TRow>,
  options: UsePaginationOptions = {},
): UsePaginationReturn<TRow> {
  const { pageSize: initialPageSize = 50, mode = 'pages', query } = options;

  const [data, setData] = useState<TRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const mountedRef = useRef(true);
  const appendMode = mode === 'loadMore' || mode === 'infinite';

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const loadPage = useCallback(
    async (page: number, size: number, append: boolean) => {
      if (!dataSource.loadPage) return;

      setIsLoading(true);
      setError(null);

      const params: PageParams = {
        offset: page * size,
        limit: size,
        query,
      };

      try {
        const result = await dataSource.loadPage(params);
        if (!mountedRef.current) return;

        if (append) {
          setData((prev) => [...prev, ...result.rows]);
        } else {
          setData(result.rows);
        }
        setTotalCount(result.totalCount);
        setHasMore(result.hasMore);
        setIsLoading(false);
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    },
    [dataSource, query],
  );

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    loadPage(0, pageSize, false);
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(0, Math.min(page, totalPages - 1));
      setCurrentPage(clamped);
      loadPage(clamped, pageSize, false);
    },
    [totalPages, pageSize, loadPage],
  );

  const setPageSize = useCallback(
    (size: number) => {
      setPageSizeState(size);
      setCurrentPage(0);
      if (appendMode) {
        setData([]);
      }
      loadPage(0, size, false);
    },
    [loadPage, appendMode],
  );

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    loadPage(nextPage, pageSize, true);
  }, [hasMore, isLoading, currentPage, pageSize, loadPage]);

  const refresh = useCallback(() => {
    if (appendMode) {
      setData([]);
      setCurrentPage(0);
      loadPage(0, pageSize, false);
    } else {
      loadPage(currentPage, pageSize, false);
    }
  }, [appendMode, currentPage, pageSize, loadPage]);

  return {
    data,
    isLoading,
    error,
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    hasMore,
    goToPage,
    setPageSize,
    loadMore,
    refresh,
  };
}
