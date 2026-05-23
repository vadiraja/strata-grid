import { useState, useCallback } from 'react';
import type { DataSource } from './data-source';
import type { WhereUsedResult } from './types';
import { findWhereUsed } from './where-used';

export interface UseWhereUsedReturn<TRow> {
  /** Query results. */
  results: WhereUsedResult<TRow>[];
  /** Whether a query is in progress. */
  isLoading: boolean;
  /** Error from the last query. */
  error: Error | null;
  /** Execute a where-used query for a node. */
  query: (nodeId: string) => void;
  /** Clear results. */
  clear: () => void;
}

/**
 * Hook managing where-used queries.
 * Uses dataSource.whereUsed() if available, otherwise falls back to
 * in-memory tree traversal.
 */
export function useWhereUsed<TRow>(
  dataSource: DataSource<TRow>,
  rows: TRow[],
  getRowId: (row: TRow) => string,
  getParentId: (row: TRow) => string | null | undefined,
): UseWhereUsedReturn<TRow> {
  const [results, setResults] = useState<WhereUsedResult<TRow>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const query = useCallback(
    (nodeId: string) => {
      setError(null);

      if (dataSource.whereUsed) {
        // Server-side
        setIsLoading(true);
        dataSource
          .whereUsed(nodeId)
          .then((res) => {
            setResults(res);
            setIsLoading(false);
          })
          .catch((err) => {
            setError(err instanceof Error ? err : new Error(String(err)));
            setIsLoading(false);
          });
      } else {
        // In-memory fallback
        const res = findWhereUsed(rows, nodeId, getRowId, getParentId);
        setResults(res);
      }
    },
    [dataSource, rows, getRowId, getParentId],
  );

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, isLoading, error, query, clear };
}
