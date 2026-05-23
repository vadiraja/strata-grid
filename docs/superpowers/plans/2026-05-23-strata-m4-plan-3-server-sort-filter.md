# Strata M4 · Plan 3 — Server-Side Sort & Filter · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the data source declares `serverSort` and/or `serverFilter` capabilities, the grid delegates sort and filter operations to the backend via `dataSource.load(query)` instead of running them client-side through TanStack Table. Includes loading overlay during server round-trips.

**Architecture:** A `useServerDataSource` hook intercepts sort/filter state changes. When server capabilities are detected, it builds a `DataQuery` from the current sort + filter state and calls `load(query)`. The grid shows a loading overlay during the request. Client-side TanStack Table sorting/filtering is disabled for server-managed columns.

**Tech Stack:** TypeScript, React 18/19, Vitest + React Testing Library, MSW for mock server.

**Spec:** `docs/superpowers/specs/2026-05-23-strata-m4-scale-enterprise-design.md` (§3.2, §6 — server-side sort/filter flow).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/data/use-server-data-source.ts` | create | Orchestrates server-side load with sort/filter push-down |
| `src/data/use-server-data-source.test.ts` | create | Unit tests for server-side data loading |
| `src/data/build-data-query.ts` | create | Builds DataQuery from grid state |
| `src/data/build-data-query.test.ts` | create | Unit tests for query building |
| `src/components/LoadingOverlay.tsx` | create | Full-grid loading overlay |
| `src/components/LoadingOverlay.test.tsx` | create | Overlay component tests |
| `src/components/DataGrid.tsx` | modify | Wire server data source, show overlay |
| `src/data/index.ts` | modify | Export new modules |

---

## Task 1: DataQuery builder

A pure function that builds a `DataQuery` object from the grid's current sort and filter state.

**Files:**
- Create: `src/data/build-data-query.ts`
- Create: `src/data/build-data-query.test.ts`

- [ ] **Step 1: Write failing tests — `src/data/build-data-query.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { buildDataQuery } from './build-data-query';
import type { ColumnSort } from '../model/types';
import type { FilterExpression } from './types';

describe('buildDataQuery', () => {
  it('returns empty query when no sort or filter', () => {
    const query = buildDataQuery({});
    expect(query).toEqual({});
  });

  it('includes sort when provided', () => {
    const sort: ColumnSort[] = [
      { columnId: 'name', direction: 'asc' },
      { columnId: 'age', direction: 'desc' },
    ];
    const query = buildDataQuery({ sort });
    expect(query.sort).toEqual(sort);
  });

  it('includes filters when provided', () => {
    const filters: FilterExpression[] = [
      { columnId: 'name', operator: 'contains', value: 'Alice' },
    ];
    const query = buildDataQuery({ filters });
    expect(query.filters).toEqual(filters);
  });

  it('includes search term when provided', () => {
    const query = buildDataQuery({ search: 'hello' });
    expect(query.search).toBe('hello');
  });

  it('includes expanded ids when provided', () => {
    const query = buildDataQuery({ expandedIds: ['a', 'b', 'c'] });
    expect(query.expandedIds).toEqual(['a', 'b', 'c']);
  });

  it('combines all fields', () => {
    const sort: ColumnSort[] = [{ columnId: 'name', direction: 'asc' }];
    const filters: FilterExpression[] = [
      { columnId: 'age', operator: 'greaterThan', value: 25 },
    ];
    const query = buildDataQuery({
      sort,
      filters,
      search: 'test',
      expandedIds: ['x'],
    });
    expect(query).toEqual({ sort, filters, search: 'test', expandedIds: ['x'] });
  });

  it('omits undefined fields from the query', () => {
    const query = buildDataQuery({ sort: [{ columnId: 'a', direction: 'asc' }] });
    expect(query).not.toHaveProperty('filters');
    expect(query).not.toHaveProperty('search');
    expect(query).not.toHaveProperty('expandedIds');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/build-data-query.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/data/build-data-query.ts`**

```ts
import type { ColumnSort } from '../model/types';
import type { DataQuery, FilterExpression } from './types';

export interface BuildDataQueryParams {
  sort?: ColumnSort[];
  filters?: FilterExpression[];
  search?: string;
  expandedIds?: string[];
}

/**
 * Builds a DataQuery object from the grid's current state.
 * Only includes fields that have values — omits undefined fields
 * so the server can distinguish "no sort" from "sort by nothing".
 */
export function buildDataQuery(params: BuildDataQueryParams): DataQuery {
  const query: DataQuery = {};

  if (params.sort && params.sort.length > 0) {
    query.sort = params.sort;
  }
  if (params.filters && params.filters.length > 0) {
    query.filters = params.filters;
  }
  if (params.search) {
    query.search = params.search;
  }
  if (params.expandedIds && params.expandedIds.length > 0) {
    query.expandedIds = params.expandedIds;
  }

  return query;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/data/build-data-query.test.ts`
Expected: PASS — all tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/data/build-data-query.ts src/data/build-data-query.test.ts
git commit -m "feat(m4): add buildDataQuery utility for sort/filter push-down"
```

---

## Task 2: useServerDataSource hook

The hook that orchestrates server-side data loading. It watches sort/filter state, builds queries, calls `load(query)`, and manages loading/error states.

**Files:**
- Create: `src/data/use-server-data-source.ts`
- Create: `src/data/use-server-data-source.test.ts`

- [ ] **Step 1: Write failing tests — `src/data/use-server-data-source.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useServerDataSource } from './use-server-data-source';
import type { DataSource } from './data-source';
import type { ColumnSort } from '../model/types';
import type { FilterExpression } from './types';

interface Row { id: string; name: string }

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
    const ds = createServerDS();
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
      () => new Promise<Row[]>((resolve) => { resolveFn = resolve; }),
    );
    const ds = createServerDS(loadFn);
    const { result, unmount } = renderHook(() => useServerDataSource(ds));

    expect(result.current.isLoading).toBe(true);
    unmount();

    // Resolve after unmount — should not throw
    act(() => { resolveFn!(mockRows); });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/use-server-data-source.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/data/use-server-data-source.ts`**

```ts
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

    const result = dataSource.load(
      Object.keys(query).length > 0 ? query : undefined,
    );

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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/data/use-server-data-source.test.ts`
Expected: PASS — all tests passing.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/data/use-server-data-source.ts src/data/use-server-data-source.test.ts
git commit -m "feat(m4): add useServerDataSource hook for sort/filter push-down"
```

---

## Task 3: LoadingOverlay component

A full-grid overlay shown during server-side data loading (sort/filter changes). Semi-transparent with a spinner.

**Files:**
- Create: `src/components/LoadingOverlay.tsx`
- Create: `src/components/LoadingOverlay.test.tsx`

- [ ] **Step 1: Write failing tests — `src/components/LoadingOverlay.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingOverlay } from './LoadingOverlay';

describe('LoadingOverlay', () => {
  it('renders when visible', () => {
    render(<LoadingOverlay visible />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading data');
  });

  it('does not render when not visible', () => {
    render(<LoadingOverlay visible={false} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('has the correct CSS class', () => {
    render(<LoadingOverlay visible />);
    expect(screen.getByRole('status').parentElement).toHaveClass('strata-loading-overlay');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/LoadingOverlay.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/components/LoadingOverlay.tsx`**

```tsx
import type { FC } from 'react';

export interface LoadingOverlayProps {
  /** Whether the overlay is visible. */
  visible: boolean;
}

/**
 * Full-grid loading overlay shown during server-side operations.
 * Semi-transparent backdrop with a centered spinner.
 */
export const LoadingOverlay: FC<LoadingOverlayProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="strata-loading-overlay">
      <div role="status" aria-label="Loading data" className="strata-loading-spinner">
        <svg
          className="strata-spinner-icon"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="60"
            strokeDashoffset="20"
          />
        </svg>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/LoadingOverlay.test.tsx`
Expected: PASS — all tests passing.

- [ ] **Step 5: Add CSS for LoadingOverlay to `src/strata.css`**

Append:

```css
/* --- Loading overlay --- */

.strata-loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--strata-overlay-bg, rgba(255, 255, 255, 0.7));
  z-index: 10;
  pointer-events: all;
}

.strata-loading-spinner {
  color: var(--strata-accent, #2563eb);
}

.strata-spinner-icon {
  animation: strata-spin 1s linear infinite;
}

@keyframes strata-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 7: Commit**

```bash
git add src/components/LoadingOverlay.tsx src/components/LoadingOverlay.test.tsx src/strata.css
git commit -m "feat(m4): add LoadingOverlay component for server-side operations"
```

---

## Task 4: Wire server data source into DataGrid

Connect `useServerDataSource` to the grid. When the data source has server capabilities, sort/filter changes go through the server hook instead of TanStack Table's client-side pipeline.

**Files:**
- Modify: `src/components/DataGrid.tsx`
- Modify: `src/data/index.ts`

- [ ] **Step 1: Update DataGrid to detect server capabilities and use server hook**

```ts
import { useServerDataSource } from '../data/use-server-data-source';
import { LoadingOverlay } from './LoadingOverlay';

// Inside DataGrid:
const capabilities = dataSource?.capabilities?.() ?? {};
const isServerSorted = capabilities.serverSort ?? false;
const isServerFiltered = capabilities.serverFilter ?? false;

// Use server data source when server capabilities exist
const serverDS = useServerDataSource(dataSource);

// When server-sorted, intercept sort changes:
const handleSortChange = (newSort: ColumnSort[]) => {
  if (isServerSorted) {
    serverDS.setSort(newSort);
  } else {
    // existing client-side sort logic
  }
  onSortChange?.(newSort);
};

// When server-filtered, intercept filter changes:
const handleFilterChange = (columnId: string, value: unknown) => {
  if (isServerFiltered) {
    // Build filter expression and push to server
    serverDS.setFilters([...currentFilters]);
  } else {
    // existing client-side filter logic
  }
};

// Render overlay when server is loading
return (
  <div className="strata-grid-wrapper" style={{ position: 'relative' }}>
    <GridRoot ... />
    <LoadingOverlay visible={serverDS.isLoading && !initialLoad} />
  </div>
);
```

- [ ] **Step 2: Disable TanStack Table client-side sort/filter when server handles it**

When `isServerSorted` is true, configure TanStack Table with `manualSorting: true`.
When `isServerFiltered` is true, configure with `manualFiltering: true`.

- [ ] **Step 3: Export useServerDataSource from data barrel**

Add to `src/data/index.ts`:

```ts
export { useServerDataSource } from './use-server-data-source';
export type { UseServerDataSourceReturn } from './use-server-data-source';
export { buildDataQuery } from './build-data-query';
export type { BuildDataQueryParams } from './build-data-query';
```

- [ ] **Step 4: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/components/DataGrid.tsx src/data/index.ts
git commit -m "feat(m4): wire server-side sort/filter into DataGrid"
```
