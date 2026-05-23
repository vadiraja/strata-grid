# Strata M4 · Plan 4 — Pagination · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pagination support — page-based, load-more, and infinite-scroll modes. The grid calls `dataSource.loadPage()` to fetch pages of data, shows a `PaginationBar` with page controls, and manages page state.

**Architecture:** A `usePagination` hook manages current page, page size, total count, and loading state. It calls `dataSource.loadPage(params)` on page changes. Three modes: `pages` (traditional page numbers), `loadMore` (append button), and `infinite` (scroll-triggered append). The `PaginationBar` component renders page controls in the grid footer.

**Tech Stack:** TypeScript, React 18/19, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-23-strata-m4-scale-enterprise-design.md` (§3.3, §5.1, §6 — pagination flow).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/data/use-pagination.ts` | create | Pagination state management hook |
| `src/data/use-pagination.test.ts` | create | Unit tests for pagination |
| `src/components/PaginationBar.tsx` | create | Page controls component |
| `src/components/PaginationBar.test.tsx` | create | PaginationBar component tests |
| `src/components/DataGrid.tsx` | modify | Wire pagination, accept `pagination` prop |
| `src/model/types.ts` | modify | Add `PaginationConfig` type |
| `src/data/index.ts` | modify | Export pagination hook |

---

## Task 1: Pagination types

Add pagination configuration types to the model.

**Files:**
- Modify: `src/model/types.ts`

- [ ] **Step 1: Add pagination types to `src/model/types.ts`**

Append after the `AggregationConfig` interface:

```ts
/**
 * Configures pagination behavior.
 */
export interface PaginationConfig {
  /** Rows per page. Default: 50. */
  pageSize?: number;
  /** Available page size options for the user to choose from. */
  pageSizeOptions?: number[];
  /** Pagination mode. Default: 'pages'. */
  mode?: 'pages' | 'loadMore' | 'infinite';
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/model/types.ts
git commit -m "feat(m4): add PaginationConfig type"
```

---

## Task 2: usePagination hook

Manages page state, calls `loadPage()`, and handles page transitions.

**Files:**
- Create: `src/data/use-pagination.ts`
- Create: `src/data/use-pagination.test.ts`

- [ ] **Step 1: Write failing tests — `src/data/use-pagination.test.ts`**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/use-pagination.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/data/use-pagination.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/data/use-pagination.test.ts`
Expected: PASS — all tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/data/use-pagination.ts src/data/use-pagination.test.ts
git commit -m "feat(m4): add usePagination hook for page-based data loading"
```

---

## Task 3: PaginationBar component

A footer component showing page controls: previous/next buttons, page number display, page size selector, and total count.

**Files:**
- Create: `src/components/PaginationBar.tsx`
- Create: `src/components/PaginationBar.test.tsx`

- [ ] **Step 1: Write failing tests — `src/components/PaginationBar.test.tsx`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PaginationBar } from './PaginationBar';

describe('PaginationBar', () => {
  const defaultProps = {
    currentPage: 0,
    totalPages: 5,
    pageSize: 10,
    totalCount: 50,
    pageSizeOptions: [10, 25, 50, 100],
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  };

  it('renders page info', () => {
    render(<PaginationBar {...defaultProps} />);
    expect(screen.getByText(/1–10 of 50/)).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    render(<PaginationBar {...defaultProps} currentPage={0} />);
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<PaginationBar {...defaultProps} currentPage={4} />);
    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });

  it('calls onPageChange when next is clicked', () => {
    const onPageChange = vi.fn();
    render(<PaginationBar {...defaultProps} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange when previous is clicked', () => {
    const onPageChange = vi.fn();
    render(
      <PaginationBar {...defaultProps} currentPage={2} onPageChange={onPageChange} />,
    );
    fireEvent.click(screen.getByLabelText('Previous page'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageSizeChange when page size is changed', () => {
    const onPageSizeChange = vi.fn();
    render(
      <PaginationBar {...defaultProps} onPageSizeChange={onPageSizeChange} />,
    );
    fireEvent.change(screen.getByLabelText('Rows per page'), {
      target: { value: '25' },
    });
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it('renders load more button in loadMore mode', () => {
    const onLoadMore = vi.fn();
    render(
      <PaginationBar
        {...defaultProps}
        mode="loadMore"
        hasMore={true}
        onLoadMore={onLoadMore}
      />,
    );
    const btn = screen.getByRole('button', { name: /load more/i });
    fireEvent.click(btn);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('disables load more when hasMore is false', () => {
    render(
      <PaginationBar
        {...defaultProps}
        mode="loadMore"
        hasMore={false}
        onLoadMore={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /load more/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/PaginationBar.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/components/PaginationBar.tsx`**

```tsx
import type { FC } from 'react';

export interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  pageSizeOptions?: number[];
  mode?: 'pages' | 'loadMore' | 'infinite';
  hasMore?: boolean;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onLoadMore?: () => void;
}

/**
 * Pagination controls rendered in the grid footer.
 * Supports page navigation, page size selection, and load-more mode.
 */
export const PaginationBar: FC<PaginationBarProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  pageSizeOptions = [10, 25, 50, 100],
  mode = 'pages',
  hasMore = true,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  onLoadMore,
}) => {
  const startRow = currentPage * pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pageSize, totalCount);

  if (mode === 'loadMore') {
    return (
      <div className="strata-pagination strata-pagination-load-more">
        <span className="strata-pagination-info">
          Showing {totalCount > 0 ? endRow : 0} of {totalCount}
        </span>
        <button
          className="strata-pagination-load-more-btn"
          onClick={onLoadMore}
          disabled={!hasMore || isLoading}
          aria-label="Load more rows"
        >
          {isLoading ? 'Loading...' : 'Load more'}
        </button>
      </div>
    );
  }

  return (
    <div className="strata-pagination">
      <div className="strata-pagination-size">
        <label htmlFor="strata-page-size" className="strata-pagination-label">
          Rows per page
        </label>
        <select
          id="strata-page-size"
          aria-label="Rows per page"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="strata-pagination-select"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <span className="strata-pagination-info">
        {totalCount > 0 ? `${startRow}–${endRow} of ${totalCount}` : '0 rows'}
      </span>

      <div className="strata-pagination-nav">
        <button
          className="strata-pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          aria-label="Previous page"
        >
          ‹
        </button>
        <button
          className="strata-pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/PaginationBar.test.tsx`
Expected: PASS — all tests passing.

- [ ] **Step 5: Add CSS for PaginationBar to `src/strata.css`**

Append:

```css
/* --- Pagination --- */

.strata-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  padding: 8px 12px;
  border-top: 1px solid var(--strata-border-color, #e5e7eb);
  font-size: 0.85em;
}

.strata-pagination-size {
  display: flex;
  align-items: center;
  gap: 6px;
}

.strata-pagination-label {
  color: var(--strata-color-secondary, #6b7280);
}

.strata-pagination-select {
  padding: 2px 6px;
  border: 1px solid var(--strata-border-color, #d1d5db);
  border-radius: 4px;
  background: var(--strata-bg, #fff);
}

.strata-pagination-info {
  color: var(--strata-color-secondary, #6b7280);
}

.strata-pagination-nav {
  display: flex;
  gap: 4px;
}

.strata-pagination-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--strata-border-color, #d1d5db);
  border-radius: 4px;
  background: var(--strata-bg, #fff);
  cursor: pointer;
  font-size: 1.1em;
}

.strata-pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.strata-pagination-btn:hover:not(:disabled) {
  background: var(--strata-bg-row-hover, #f3f4f6);
}

.strata-pagination-load-more {
  justify-content: center;
}

.strata-pagination-load-more-btn {
  padding: 6px 16px;
  border: 1px solid var(--strata-border-color, #d1d5db);
  border-radius: 4px;
  background: var(--strata-bg, #fff);
  cursor: pointer;
}

.strata-pagination-load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 7: Commit**

```bash
git add src/components/PaginationBar.tsx src/components/PaginationBar.test.tsx src/strata.css
git commit -m "feat(m4): add PaginationBar component"
```

---

## Task 4: Wire pagination into DataGrid

Connect the `usePagination` hook and `PaginationBar` to the grid. Accept a `pagination` prop and render the bar in the footer.

**Files:**
- Modify: `src/components/DataGrid.tsx`
- Modify: `src/data/index.ts`

- [ ] **Step 1: Accept `pagination` prop and wire usePagination**

```ts
import { usePagination } from '../data/use-pagination';
import { PaginationBar } from './PaginationBar';
import type { PaginationConfig } from '../model/types';

// In DataGridProps:
pagination?: PaginationConfig;

// Inside DataGrid:
const paginationState = usePagination(dataSource, {
  pageSize: pagination?.pageSize,
  mode: pagination?.mode,
});

// Use paginationState.data as the grid's row source when pagination is active
const rows = pagination ? paginationState.data : (serverDS?.data ?? data);
```

- [ ] **Step 2: Render PaginationBar in the footer**

```tsx
{pagination && (
  <PaginationBar
    currentPage={paginationState.currentPage}
    totalPages={paginationState.totalPages}
    pageSize={paginationState.pageSize}
    totalCount={paginationState.totalCount}
    pageSizeOptions={pagination.pageSizeOptions}
    mode={pagination.mode}
    hasMore={paginationState.hasMore}
    isLoading={paginationState.isLoading}
    onPageChange={paginationState.goToPage}
    onPageSizeChange={paginationState.setPageSize}
    onLoadMore={paginationState.loadMore}
  />
)}
```

- [ ] **Step 3: Export usePagination from data barrel**

Add to `src/data/index.ts`:

```ts
export { usePagination } from './use-pagination';
export type { UsePaginationOptions, UsePaginationReturn } from './use-pagination';
```

- [ ] **Step 4: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/components/DataGrid.tsx src/data/index.ts src/model/types.ts
git commit -m "feat(m4): wire pagination into DataGrid with PaginationBar"
```
