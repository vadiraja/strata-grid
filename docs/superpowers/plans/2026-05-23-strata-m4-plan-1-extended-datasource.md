# Strata M4 · Plan 1 — Extended DataSource & Capabilities · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the `DataSource` interface with optional methods for server-side operations (lazy children, pagination, live updates, where-used, export-all), add the `DataQuery` type for sort/filter push-down, and implement capability detection so the grid adapts its behavior based on what the data source supports.

**Architecture:** The existing `DataSource<TRow>` interface gains optional methods. A `DataSourceCapabilities` object declares what the source supports. The grid calls `dataSource.capabilities?.()` at mount and stores the result, using it to decide whether to sort/filter client-side (TanStack Table) or server-side (via `load(query)`). `InMemoryDataSource` remains unchanged — it simply doesn't declare server-side capabilities.

**Tech Stack:** TypeScript, React 18/19, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-23-strata-m4-scale-enterprise-design.md` (§3.1–§3.4).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/data/data-source.ts` | modify | Extended `DataSource` interface with optional methods |
| `src/data/types.ts` | create | `DataQuery`, `FilterExpression`, `PageParams`, `PageResult`, `DataSourceCapabilities`, `DataChangeEvent` |
| `src/data/use-data-source.ts` | create | Hook that wraps a DataSource, detects capabilities, manages loading state |
| `src/data/use-data-source.test.ts` | create | Unit tests for capability detection and data loading |
| `src/data/index.ts` | create | Barrel export for data module |
| `src/data/in-memory-data-source.ts` | modify | Add `capabilities()` returning empty (all client-side) |

---

## Task 1: Data types

Define all the new types for server-side operations: `DataQuery`, `FilterExpression`, `FilterOperator`, `PageParams`, `PageResult`, `DataSourceCapabilities`, `DataChangeEvent`, and `WhereUsedResult`.

**Files:**
- Create: `src/data/types.ts`

- [ ] **Step 1: Create `src/data/types.ts`**

```ts
import type { ColumnSort } from '../model/types';

// --- Filter expressions ---

/**
 * Operators available for filter conditions.
 */
export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterOrEqual'
  | 'lessOrEqual'
  | 'in'
  | 'notIn'
  | 'between'
  | 'isEmpty'
  | 'isNotEmpty';

/**
 * A single filter condition or a compound group of conditions.
 */
export interface FilterExpression {
  /** The column to filter on (leaf condition). */
  columnId?: string;
  /** The comparison operator (leaf condition). */
  operator?: FilterOperator;
  /** The value to compare against (leaf condition). */
  value?: unknown;
  /** Logical combinator for compound expressions. */
  logic?: 'and' | 'or';
  /** Child expressions for compound filters. */
  children?: FilterExpression[];
}

// --- Data query (sort/filter push-down) ---

/**
 * Query object sent to server-side data sources for sort/filter push-down.
 */
export interface DataQuery {
  /** Server-side sort specification. */
  sort?: ColumnSort[];
  /** Server-side filter specification. */
  filters?: FilterExpression[];
  /** Global quick-search term. */
  search?: string;
  /** Expanded node ids (for server to know which children to include). */
  expandedIds?: string[];
}

// --- Pagination ---

/**
 * Parameters for a paginated data request.
 */
export interface PageParams {
  /** Zero-based offset or a cursor string for cursor-based pagination. */
  offset: number | string;
  /** Number of rows per page. */
  limit: number;
  /** Sort/filter to apply server-side. */
  query?: DataQuery;
}

/**
 * Result of a paginated data request.
 */
export interface PageResult<TRow> {
  /** The rows for this page. */
  rows: TRow[];
  /** Total number of rows across all pages. */
  totalCount: number;
  /** Cursor for the next page (cursor-based pagination). */
  nextCursor?: string;
  /** Whether more pages exist after this one. */
  hasMore: boolean;
}

// --- Capability detection ---

/**
 * Declares which server-side capabilities a DataSource supports.
 * The grid uses this to decide client-side vs server-side behavior.
 */
export interface DataSourceCapabilities {
  /** Supports server-side sorting. */
  serverSort?: boolean;
  /** Supports server-side filtering. */
  serverFilter?: boolean;
  /** Supports lazy child loading (load-on-expand). */
  lazyChildren?: boolean;
  /** Supports pagination. */
  pagination?: boolean;
  /** Supports live/streaming updates. */
  liveUpdates?: boolean;
  /** Supports where-used queries. */
  whereUsed?: boolean;
  /** Supports export-all (bypassing pagination). */
  exportAll?: boolean;
}

// --- Live / streaming updates ---

/**
 * Event describing a data change from the backend.
 */
export interface DataChangeEvent<TRow> {
  /** The type of change. */
  type: 'add' | 'update' | 'delete' | 'refresh';
  /** Affected rows (for add/update/delete). */
  rows?: { id: string; data?: TRow; parentId?: string | null }[];
}

/**
 * Handler for live data change events.
 */
export type DataChangeHandler<TRow> = (event: DataChangeEvent<TRow>) => void;

// --- Where-used ---

/**
 * A single where-used result — one parent assembly that uses a component.
 */
export interface WhereUsedResult<TRow> {
  /** The parent assembly that uses this component. */
  parentNode: TRow;
  /** The path from root to this usage (ancestors in order). */
  path: TRow[];
  /** Quantity used in this parent. */
  quantity?: number;
}

// --- Loading state ---

/**
 * Loading state exposed by the grid for server-side operations.
 */
export interface LoadingState {
  /** Whether the grid is in initial loading state. */
  isLoading: boolean;
  /** Node ids currently loading children. */
  loadingNodes: Set<string>;
  /** Whether a page is being fetched. */
  isPageLoading: boolean;
  /** Error from the last load attempt. */
  error: Error | null;
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/types.ts
git commit -m "feat(m4): add data types — DataQuery, FilterExpression, PageParams, capabilities"
```

---

## Task 2: Extend the DataSource interface

Add optional methods to the existing `DataSource` interface for server-side operations. The existing `load()` signature gains an optional `DataQuery` parameter.

**Files:**
- Modify: `src/data/data-source.ts`

- [ ] **Step 1: Update `src/data/data-source.ts`**

```ts
import type {
  DataQuery,
  PageParams,
  PageResult,
  DataSourceCapabilities,
  DataChangeHandler,
  WhereUsedResult,
} from './types';

/**
 * Abstraction over the grid's data backend.
 *
 * M1 ships `InMemoryDataSource` (synchronous, client-side).
 * M4 adds optional methods for server-side operations — lazy loading,
 * pagination, live updates, where-used, and export-all.
 *
 * The grid feature-detects capabilities via `capabilities()` and adapts
 * its behavior accordingly. Implementations only need to provide the
 * methods they support.
 */
export interface DataSource<TRow> {
  /**
   * Returns rows. Accepts an optional query for server-side sort/filter.
   * Synchronous for in-memory; async for server-side sources.
   */
  load(query?: DataQuery): TRow[] | Promise<TRow[]>;

  /**
   * Optional. Load children of a specific node (lazy tree).
   * Called when a user expands a node whose children haven't been loaded.
   */
  loadChildren?(parentId: string, query?: DataQuery): Promise<TRow[]>;

  /**
   * Optional. Load a page of flat data.
   * Used when pagination is enabled.
   */
  loadPage?(params: PageParams): Promise<PageResult<TRow>>;

  /**
   * Optional. Subscribe to live data changes.
   * Returns an unsubscribe function.
   */
  subscribe?(onChange: DataChangeHandler<TRow>): () => void;

  /**
   * Optional. Declares which server-side capabilities are supported.
   * The grid calls this at mount to determine behavior.
   */
  capabilities?(): DataSourceCapabilities;

  /**
   * Optional. Export all data bypassing pagination.
   * Used by the export feature when scope is 'all'.
   */
  exportAll?(query?: DataQuery): Promise<TRow[]>;

  /**
   * Optional. Where-used / reverse BOM lookup.
   * Given a node id, returns all parent assemblies that use it.
   */
  whereUsed?(nodeId: string): Promise<WhereUsedResult<TRow>[]>;
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors. `InMemoryDataSource` still satisfies the interface (all new methods are optional).

- [ ] **Step 3: Commit**

```bash
git add src/data/data-source.ts
git commit -m "feat(m4): extend DataSource interface with server-side methods"
```

---

## Task 3: Update InMemoryDataSource

Add a `capabilities()` method to `InMemoryDataSource` that returns an empty object (all capabilities false), confirming it's a client-side-only source.

**Files:**
- Modify: `src/data/in-memory-data-source.ts`

- [ ] **Step 1: Add `capabilities()` to `InMemoryDataSource`**

```ts
import type { DataSource } from './data-source';
import type { DataSourceCapabilities, DataChangeHandler, DataChangeEvent } from './types';

/** A {@link DataSource} backed by an in-memory array of rows. */
export class InMemoryDataSource<TRow> implements DataSource<TRow> {
  private rows: TRow[];
  private readonly listeners = new Set<DataChangeHandler<TRow>>();

  constructor(rows: TRow[]) {
    this.rows = rows;
  }

  /** Returns the current rows. Query parameter is ignored (client-side). */
  load(): TRow[] {
    return this.rows;
  }

  /** Replaces the backing rows and notifies all subscribers. */
  setRows(rows: TRow[]): void {
    this.rows = rows;
    const event: DataChangeEvent<TRow> = { type: 'refresh' };
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /** Registers a change listener. Returns an unsubscribe function. */
  subscribe(onChange: DataChangeHandler<TRow>): () => void {
    this.listeners.add(onChange);
    return () => {
      this.listeners.delete(onChange);
    };
  }

  /** InMemoryDataSource is fully client-side — no server capabilities. */
  capabilities(): DataSourceCapabilities {
    return {};
  }
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — all existing tests pass. The `subscribe` signature change (from `() => void` to `DataChangeHandler<TRow>`) is backward-compatible since the handler still receives a call.

- [ ] **Step 4: Commit**

```bash
git add src/data/in-memory-data-source.ts
git commit -m "feat(m4): add capabilities() to InMemoryDataSource"
```

---

## Task 4: useDataSource hook

Create a hook that wraps a `DataSource`, detects capabilities at mount, manages loading state, and provides a unified interface for the grid to load data (client-side or server-side).

**Files:**
- Create: `src/data/use-data-source.ts`
- Create: `src/data/use-data-source.test.ts`

- [ ] **Step 1: Write failing tests — `src/data/use-data-source.test.ts`**

```ts
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
    const { result, rerender } = renderHook(
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/use-data-source.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/data/use-data-source.ts`**

```ts
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

  const [data, setData] = useState<TRow[]>(() => {
    // Try synchronous load for in-memory sources
    const result = dataSource.load(initialQuery);
    if (Array.isArray(result)) {
      return result;
    }
    return [];
  });

  const [loadingState, setLoadingState] = useState<LoadingState>(() => {
    const result = dataSource.load(initialQuery);
    const isAsync = result instanceof Promise;
    return {
      isLoading: isAsync,
      loadingNodes: new Set(),
      isPageLoading: false,
      error: null,
    };
  });

  const lastQueryRef = useRef<DataQuery | undefined>(initialQuery);
  const mountedRef = useRef(true);

  // Handle initial async load
  useEffect(() => {
    const result = dataSource.load(initialQuery);
    if (result instanceof Promise) {
      result
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
  }, [dataSource]);

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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/data/use-data-source.test.ts`
Expected: PASS — all tests passing.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/data/use-data-source.ts src/data/use-data-source.test.ts
git commit -m "feat(m4): add useDataSource hook with capability detection"
```

---

## Task 5: Barrel export

Create the barrel export for the data module, exporting all new types and the hook.

**Files:**
- Create: `src/data/index.ts`

- [ ] **Step 1: Create `src/data/index.ts`**

```ts
export type { DataSource } from './data-source';
export { InMemoryDataSource } from './in-memory-data-source';
export { useDataSource } from './use-data-source';
export type { UseDataSourceReturn } from './use-data-source';
export type {
  DataQuery,
  FilterExpression,
  FilterOperator,
  PageParams,
  PageResult,
  DataSourceCapabilities,
  DataChangeEvent,
  DataChangeHandler,
  WhereUsedResult,
  LoadingState,
} from './types';
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/index.ts
git commit -m "feat(m4): add data module barrel export"
```
