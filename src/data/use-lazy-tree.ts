import { useState, useCallback, useRef } from 'react';
import type { DataSource } from './data-source';
import type { DataQuery } from './types';

export interface UseLazyTreeReturn<TRow> {
  /** Set of node ids currently loading children. */
  loadingNodes: Set<string>;
  /** Set of node ids that failed to load. */
  errorNodes: Set<string>;
  /** Whether a node's children have been loaded. */
  isLoaded: (nodeId: string) => boolean;
  /** Get loaded children for a node. */
  getChildren: (nodeId: string) => TRow[] | undefined;
  /** Get the error for a failed node. */
  getError: (nodeId: string) => Error | undefined;
  /** Trigger loading children for a node. Deduplicates and skips loaded nodes. */
  loadNodeChildren: (nodeId: string, query?: DataQuery) => void;
  /** Retry loading a failed node. */
  retry: (nodeId: string, query?: DataQuery) => void;
  /** Invalidate a node's children (forces reload on next expand). */
  invalidate: (nodeId: string) => void;
  /** Invalidate all loaded children. */
  invalidateAll: () => void;
}

/**
 * Hook managing lazy child loading for tree data sources.
 *
 * - Calls `dataSource.loadChildren()` when a node is expanded.
 * - Deduplicates concurrent requests for the same node.
 * - Tracks loading, loaded, and error states per node.
 * - Supports retry after failure and invalidation for refresh.
 */
export function useLazyTree<TRow>(
  dataSource: DataSource<TRow>,
): UseLazyTreeReturn<TRow> {
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [errorNodes, setErrorNodes] = useState<Set<string>>(new Set());
  const [loadedChildren, setLoadedChildren] = useState<Map<string, TRow[]>>(
    new Map(),
  );
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());

  // Track in-flight requests to deduplicate
  const inFlightRef = useRef<Set<string>>(new Set());

  const isLoaded = useCallback(
    (nodeId: string) => loadedChildren.has(nodeId),
    [loadedChildren],
  );

  const getChildren = useCallback(
    (nodeId: string) => loadedChildren.get(nodeId),
    [loadedChildren],
  );

  const getError = useCallback(
    (nodeId: string) => errors.get(nodeId),
    [errors],
  );

  const doLoad = useCallback(
    (nodeId: string, query?: DataQuery) => {
      if (!dataSource.loadChildren) return;
      if (inFlightRef.current.has(nodeId)) return; // deduplicate

      inFlightRef.current.add(nodeId);
      setLoadingNodes((prev) => new Set([...prev, nodeId]));
      setErrorNodes((prev) => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });
      setErrors((prev) => {
        const next = new Map(prev);
        next.delete(nodeId);
        return next;
      });

      dataSource
        .loadChildren(nodeId, query)
        .then((children) => {
          inFlightRef.current.delete(nodeId);
          setLoadedChildren((prev) => new Map([...prev, [nodeId, children]]));
          setLoadingNodes((prev) => {
            const next = new Set(prev);
            next.delete(nodeId);
            return next;
          });
        })
        .catch((err: unknown) => {
          inFlightRef.current.delete(nodeId);
          const error = err instanceof Error ? err : new Error(String(err));
          setErrors((prev) => new Map([...prev, [nodeId, error]]));
          setErrorNodes((prev) => new Set([...prev, nodeId]));
          setLoadingNodes((prev) => {
            const next = new Set(prev);
            next.delete(nodeId);
            return next;
          });
        });
    },
    [dataSource],
  );

  const loadNodeChildren = useCallback(
    (nodeId: string, query?: DataQuery) => {
      // Skip if already loaded
      if (loadedChildren.has(nodeId)) return;
      doLoad(nodeId, query);
    },
    [loadedChildren, doLoad],
  );

  const retry = useCallback(
    (nodeId: string, query?: DataQuery) => {
      doLoad(nodeId, query);
    },
    [doLoad],
  );

  const invalidate = useCallback((nodeId: string) => {
    setLoadedChildren((prev) => {
      const next = new Map(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  const invalidateAll = useCallback(() => {
    setLoadedChildren(new Map());
  }, []);

  return {
    loadingNodes,
    errorNodes,
    isLoaded,
    getChildren,
    getError,
    loadNodeChildren,
    retry,
    invalidate,
    invalidateAll,
  };
}
