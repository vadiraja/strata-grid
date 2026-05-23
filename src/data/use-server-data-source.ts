import { useState, useCallback, useRef, useEffect } from 'react';
import type { DataSource } from './data-source';
import type { DataQuery, FilterExpression } from './types';
import type { ColumnSort } from '../model/types';
import { buildDataQuery } from './build-data-query';

export interface UseServerDataSourceReturn<TRow> {
  /** Current loaded data. */
  data: TRow[];
  /** Whether a load is in progress. */
  isLoading: boolean;
  /** Error from the last load attempt. */
  error: Error | null;
  /** Update the sort state — triggers a server reload. */
  setSort: (sort: ColumnSort[]) => void;
  /** Update the filter state — triggers a server reload. */
  setFilters: (filters: FilterExpression[]) => void;
  /** Update the search term — triggers a server reload. */
  setSearch: (term: string) => void;
  /** Force a reload with the current query. */
  refresh: () => void;
}

/**
 * Hook that orchestrates server-side data loading with sort/filter push-down.
 *
 * Watches sort and filter state. When either changes, builds a DataQuery
 * and calls `dataSource.load(query)`. Manages loading and error states.
 */
export function useServerDataSource<TRow>(
  dataSource: DataSource<TRow>,
): UseServerDataSourceReturn<TRow> {
  const [data, setData] = useState<TRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const sortRef = useRef<ColumnSort[]>([]);
  const filtersRef = useRef<FilterExpression[]>([]);
  const searchRef = useRef<string>('');
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const doLoad = useCallback(() => {
    const query = buildDataQuery({
      sort: sortRef.current,
      filters: filtersRef.current,
      search: searchRef.current,
    });

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    const queryArg: DataQuery | undefined =
      Object.keys(query).length > 0 ? query : undefined;

    const result = dataSource.load(queryArg);

    if (result instanceof Promise) {
      result
        .then((rows) => {
          if (mountedRef.current && requestIdRef.current === requestId) {
            setData(rows);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (mountedRef.current && requestIdRef.current === requestId) {
            setError(err instanceof Error ? err : new Error(String(err)));
            setData([]);
            setIsLoading(false);
          }
        });
    } else {
      setData(result);
      setIsLoading(false);
    }
  }, [dataSource]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    doLoad();
    return () => {
      mountedRef.current = false;
    };
  }, [doLoad]);

  const setSort = useCallback(
    (sort: ColumnSort[]) => {
      sortRef.current = sort;
      doLoad();
    },
    [doLoad],
  );

  const setFilters = useCallback(
    (filters: FilterExpression[]) => {
      filtersRef.current = filters;
      doLoad();
    },
    [doLoad],
  );

  const setSearch = useCallback(
    (term: string) => {
      searchRef.current = term;
      doLoad();
    },
    [doLoad],
  );

  const refresh = useCallback(() => {
    doLoad();
  }, [doLoad]);

  return { data, isLoading, error, setSort, setFilters, setSearch, refresh };
}
