import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { DataSource } from './data-source';
import type { DataQuery, DataSourceCapabilities, LoadingState } from './types';

export interface UseDataSourceReturn<TRow> {
  /** Current loaded data. */
  data: TRow[];
  /** Detected capabilities of the data source. */
  capabilities: DataSourceCapabilities;
  /** Current loading state. */
  loadingState: LoadingState;
  /** Reload data with a new query. */
  reload: (query?: DataQuery) => void;
  /** Refresh data using the last query. */
  refresh: () => void;
}

/**
 * Hook that wraps a DataSource, detects capabilities, manages loading state,
 * and provides a unified interface for loading data.
 *
 * - Synchronous sources (InMemoryDataSource) load immediately with no loading state.
 * - Async sources show loading state and handle errors.
 * - Capability detection runs once at mount.
 */
export function useDataSource<TRow>(
  dataSource: DataSource<TRow>,
  initialQuery?: DataQuery,
): UseDataSourceReturn<TRow> {
  const capabilities = useMemo<DataSourceCapabilities>(
    () => dataSource.capabilities?.() ?? {},
    [dataSource],
  );

  // Determine initial state by calling load once
  const [initialState] = useState(() => {
    const result = dataSource.load(initialQuery);
    if (Array.isArray(result)) {
      return { data: result, isAsync: false };
    }
    return { data: [] as TRow[], isAsync: true, promise: result };
  });

  const [data, setData] = useState<TRow[]>(initialState.data);

  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: initialState.isAsync,
    loadingNodes: new Set(),
    isPageLoading: false,
    error: null,
  });

  const lastQueryRef = useRef<DataQuery | undefined>(initialQuery);
  const mountedRef = useRef(true);

  // Handle initial async load
  useEffect(() => {
    if (initialState.isAsync && initialState.promise) {
      initialState.promise
        .then((rows) => {
          if (mountedRef.current) {
            setData(rows);
            setLoadingState((prev) => ({ ...prev, isLoading: false, error: null }));
          }
        })
        .catch((err) => {
          if (mountedRef.current) {
            setLoadingState((prev) => ({
              ...prev,
              isLoading: false,
              error: err instanceof Error ? err : new Error(String(err)),
            }));
          }
        });
    }

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = useCallback(
    (query?: DataQuery) => {
      lastQueryRef.current = query;
      setLoadingState((prev) => ({ ...prev, isLoading: true, error: null }));

      const result = dataSource.load(query);
      if (result instanceof Promise) {
        result
          .then((rows) => {
            if (mountedRef.current) {
              setData(rows);
              setLoadingState((prev) => ({ ...prev, isLoading: false }));
            }
          })
          .catch((err) => {
            if (mountedRef.current) {
              setLoadingState((prev) => ({
                ...prev,
                isLoading: false,
                error: err instanceof Error ? err : new Error(String(err)),
              }));
            }
          });
      } else {
        setData(result);
        setLoadingState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [dataSource],
  );

  const refresh = useCallback(() => {
    reload(lastQueryRef.current);
  }, [reload]);

  return { data, capabilities, loadingState, reload, refresh };
}
