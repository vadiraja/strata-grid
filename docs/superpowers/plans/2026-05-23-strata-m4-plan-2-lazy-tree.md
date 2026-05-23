# Strata M4 · Plan 2 — Lazy Tree Loading · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement load-on-expand for tree data — when a user expands a node whose children haven't been loaded yet, the grid calls `dataSource.loadChildren(parentId)` and shows a loading indicator until the children arrive. Includes error handling with retry and deduplication of concurrent requests.

**Architecture:** A `useLazyTree` hook manages which nodes have loaded children, which are currently loading, and which have errored. On expand, if the data source has `lazyChildren` capability and the node's children aren't loaded, it calls `loadChildren()`. A `LoadingRow` component renders a skeleton/spinner placeholder. Requests are deduplicated — only one in-flight request per node.

**Tech Stack:** TypeScript, React 18/19, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-23-strata-m4-scale-enterprise-design.md` (§3.1, §6 — load-on-expand flow).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/data/use-lazy-tree.ts` | create | Lazy tree loading hook |
| `src/data/use-lazy-tree.test.ts` | create | Unit tests for lazy loading |
| `src/components/LoadingRow.tsx` | create | Loading placeholder row component |
| `src/components/LoadingRow.test.tsx` | create | LoadingRow component tests |
| `src/components/DataGrid.tsx` | modify | Wire lazy tree into expand handler |
| `src/data/index.ts` | modify | Export new hook |

---

## Task 1: useLazyTree hook

The core hook that manages lazy child loading state, deduplicates requests, and provides retry functionality.

**Files:**
- Create: `src/data/use-lazy-tree.ts`
- Create: `src/data/use-lazy-tree.test.ts`

- [ ] **Step 1: Write failing tests — `src/data/use-lazy-tree.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLazyTree } from './use-lazy-tree';
import type { DataSource } from './data-source';

interface Row {
  id: string;
  name: string;
  parentId: string | null;
}

const mockChildren: Row[] = [
  { id: 'c1', name: 'Child 1', parentId: 'p1' },
  { id: 'c2', name: 'Child 2', parentId: 'p1' },
];

function createLazyDataSource(
  loadChildrenFn?: DataSource<Row>['loadChildren'],
): DataSource<Row> {
  return {
    load: () => [{ id: 'p1', name: 'Parent', parentId: null }],
    loadChildren: loadChildrenFn ?? vi.fn(() => Promise.resolve(mockChildren)),
    capabilities: () => ({ lazyChildren: true }),
  };
}

describe('useLazyTree — initial state', () => {
  it('starts with no loading nodes', () => {
    const ds = createLazyDataSource();
    const { result } = renderHook(() => useLazyTree(ds));
    expect(result.current.loadingNodes.size).toBe(0);
    expect(result.current.errorNodes.size).toBe(0);
  });

  it('starts with no loaded nodes', () => {
    const ds = createLazyDataSource();
    const { result } = renderHook(() => useLazyTree(ds));
    expect(result.current.isLoaded('p1')).toBe(false);
  });
});

describe('useLazyTree — loadChildren', () => {
  it('loads children for a node', async () => {
    const loadChildrenFn = vi.fn(() => Promise.resolve(mockChildren));
    const ds = createLazyDataSource(loadChildrenFn);
    const { result } = renderHook(() => useLazyTree(ds));

    act(() => {
      result.current.loadNodeChildren('p1');
    });

    expect(result.current.loadingNodes.has('p1')).toBe(true);

    await waitFor(() => {
      expect(result.current.loadingNodes.has('p1')).toBe(false);
    });

    expect(result.current.isLoaded('p1')).toBe(true);
    expect(result.current.getChildren('p1')).toEqual(mockChildren);
    expect(loadChildrenFn).toHaveBeenCalledWith('p1', undefined);
  });

  it('deduplicates concurrent requests for the same node', async () => {
    const loadChildrenFn = vi.fn(() => Promise.resolve(mockChildren));
    const ds = createLazyDataSource(loadChildrenFn);
    const { result } = renderHook(() => useLazyTree(ds));

    act(() => {
      result.current.loadNodeChildren('p1');
      result.current.loadNodeChildren('p1');
      result.current.loadNodeChildren('p1');
    });

    await waitFor(() => {
      expect(result.current.isLoaded('p1')).toBe(true);
    });

    expect(loadChildrenFn).toHaveBeenCalledTimes(1);
  });

  it('does not reload already-loaded nodes', async () => {
    const loadChildrenFn = vi.fn(() => Promise.resolve(mockChildren));
    const ds = createLazyDataSource(loadChildrenFn);
    const { result } = renderHook(() => useLazyTree(ds));

    act(() => {
      result.current.loadNodeChildren('p1');
    });

    await waitFor(() => {
      expect(result.current.isLoaded('p1')).toBe(true);
    });

    act(() => {
      result.current.loadNodeChildren('p1');
    });

    expect(loadChildrenFn).toHaveBeenCalledTimes(1);
  });
});

describe('useLazyTree — error handling', () => {
  it('tracks error state on failure', async () => {
    const error = new Error('Network error');
    const loadChildrenFn = vi.fn(() => Promise.reject(error));
    const ds = createLazyDataSource(loadChildrenFn);
    const { result } = renderHook(() => useLazyTree(ds));

    act(() => {
      result.current.loadNodeChildren('p1');
    });

    await waitFor(() => {
      expect(result.current.loadingNodes.has('p1')).toBe(false);
    });

    expect(result.current.errorNodes.has('p1')).toBe(true);
    expect(result.current.getError('p1')).toBe(error);
    expect(result.current.isLoaded('p1')).toBe(false);
  });

  it('retry clears error and re-fetches', async () => {
    let callCount = 0;
    const loadChildrenFn = vi.fn(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('fail'));
      return Promise.resolve(mockChildren);
    });
    const ds = createLazyDataSource(loadChildrenFn);
    const { result } = renderHook(() => useLazyTree(ds));

    act(() => {
      result.current.loadNodeChildren('p1');
    });

    await waitFor(() => {
      expect(result.current.errorNodes.has('p1')).toBe(true);
    });

    act(() => {
      result.current.retry('p1');
    });

    await waitFor(() => {
      expect(result.current.isLoaded('p1')).toBe(true);
    });

    expect(result.current.errorNodes.has('p1')).toBe(false);
    expect(result.current.getChildren('p1')).toEqual(mockChildren);
  });
});

describe('useLazyTree — invalidate', () => {
  it('invalidate forces reload on next expand', async () => {
    const loadChildrenFn = vi.fn(() => Promise.resolve(mockChildren));
    const ds = createLazyDataSource(loadChildrenFn);
    const { result } = renderHook(() => useLazyTree(ds));

    act(() => {
      result.current.loadNodeChildren('p1');
    });

    await waitFor(() => {
      expect(result.current.isLoaded('p1')).toBe(true);
    });

    act(() => {
      result.current.invalidate('p1');
    });

    expect(result.current.isLoaded('p1')).toBe(false);

    act(() => {
      result.current.loadNodeChildren('p1');
    });

    await waitFor(() => {
      expect(result.current.isLoaded('p1')).toBe(true);
    });

    expect(loadChildrenFn).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/use-lazy-tree.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/data/use-lazy-tree.ts`**

```ts
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
        .catch((err) => {
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/data/use-lazy-tree.test.ts`
Expected: PASS — all tests passing.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/data/use-lazy-tree.ts src/data/use-lazy-tree.test.ts
git commit -m "feat(m4): add useLazyTree hook for load-on-expand"
```

---

## Task 2: LoadingRow component

A placeholder row rendered while a node's children are being loaded. Shows a skeleton animation or spinner at the appropriate indent level.

**Files:**
- Create: `src/components/LoadingRow.tsx`
- Create: `src/components/LoadingRow.test.tsx`

- [ ] **Step 1: Write failing tests — `src/components/LoadingRow.test.tsx`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoadingRow } from './LoadingRow';

describe('LoadingRow', () => {
  it('renders a loading indicator', () => {
    render(<LoadingRow depth={1} />);
    expect(screen.getByRole('row')).toBeInTheDocument();
    expect(screen.getByRole('row')).toHaveClass('strata-row-loading');
  });

  it('indents based on depth', () => {
    const { container } = render(<LoadingRow depth={3} />);
    const indent = container.querySelector('.strata-loading-indent');
    expect(indent).toHaveStyle({ paddingLeft: '72px' }); // 3 * 24px
  });

  it('renders with aria-busy', () => {
    render(<LoadingRow depth={1} />);
    expect(screen.getByRole('row')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders error state with retry button', () => {
    const onRetry = vi.fn();
    render(<LoadingRow depth={1} error="Failed to load" onRetry={onRetry} />);
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows error message', () => {
    render(<LoadingRow depth={1} error="Network timeout" />);
    expect(screen.getByText('Network timeout')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/LoadingRow.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/components/LoadingRow.tsx`**

```tsx
import type { FC } from 'react';

const INDENT_PX = 24;

export interface LoadingRowProps {
  /** Tree depth for indentation. */
  depth: number;
  /** Error message (renders error state instead of loading). */
  error?: string;
  /** Retry callback for error state. */
  onRetry?: () => void;
  /** Row height in pixels. */
  height?: number;
}

/**
 * Placeholder row shown while a tree node's children are being loaded.
 * Shows a skeleton animation in normal state, or an error with retry in error state.
 */
export const LoadingRow: FC<LoadingRowProps> = ({
  depth,
  error,
  onRetry,
  height = 36,
}) => {
  const indentPx = depth * INDENT_PX;

  if (error) {
    return (
      <div
        role="row"
        className="strata-row strata-row-loading strata-row-error"
        style={{ height }}
      >
        <div className="strata-loading-indent" style={{ paddingLeft: `${indentPx}px` }}>
          <span className="strata-loading-error-message">{error}</span>
          {onRetry && (
            <button
              className="strata-loading-retry-btn"
              onClick={onRetry}
              aria-label="Retry loading"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="row"
      className="strata-row strata-row-loading"
      style={{ height }}
      aria-busy="true"
    >
      <div className="strata-loading-indent" style={{ paddingLeft: `${indentPx}px` }}>
        <div className="strata-loading-skeleton" />
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/LoadingRow.test.tsx`
Expected: PASS — all tests passing.

- [ ] **Step 5: Add CSS for LoadingRow to `src/strata.css`**

Append:

```css
/* --- Lazy loading --- */

.strata-row-loading {
  display: flex;
  align-items: center;
}

.strata-loading-indent {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.strata-loading-skeleton {
  height: 12px;
  width: 60%;
  border-radius: 4px;
  background: var(--strata-bg-row-hover, #e5e7eb);
  animation: strata-skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes strata-skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.strata-row-error .strata-loading-error-message {
  color: var(--strata-color-error, #dc2626);
  font-size: 0.85em;
}

.strata-loading-retry-btn {
  padding: 2px 8px;
  font-size: 0.8em;
  border: 1px solid var(--strata-border-color, #d1d5db);
  border-radius: 4px;
  background: var(--strata-bg, #fff);
  cursor: pointer;
}

.strata-loading-retry-btn:hover {
  background: var(--strata-bg-row-hover, #f3f4f6);
}
```

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 7: Commit**

```bash
git add src/components/LoadingRow.tsx src/components/LoadingRow.test.tsx src/strata.css
git commit -m "feat(m4): add LoadingRow component for lazy tree loading"
```

---

## Task 3: Wire lazy tree into DataGrid expand handler

Connect the `useLazyTree` hook to the grid's expand/collapse logic. When a node is expanded and the data source supports lazy children, trigger `loadNodeChildren` instead of expecting children in the data.

**Files:**
- Modify: `src/components/DataGrid.tsx`
- Modify: `src/data/index.ts`

- [ ] **Step 1: Update DataGrid to use useLazyTree when dataSource has lazyChildren capability**

In `DataGrid.tsx`, add:

```ts
import { useLazyTree } from '../data/use-lazy-tree';

// Inside DataGrid component:
const lazyTree = useLazyTree(dataSource);
const capabilities = dataSource.capabilities?.() ?? {};

// Modify the expand handler:
const handleRowExpand = (rowId: string, expanded: boolean) => {
  if (expanded && capabilities.lazyChildren && !lazyTree.isLoaded(rowId)) {
    lazyTree.loadNodeChildren(rowId);
  }
  // ... existing expand logic
  onRowExpandChange?.({ rowId, expanded });
};
```

- [ ] **Step 2: Render LoadingRow for nodes that are loading**

In the body rendering logic, after a parent row that is expanded and loading:

```tsx
import { LoadingRow } from './LoadingRow';

// In the row rendering loop:
if (lazyTree.loadingNodes.has(row.id)) {
  // Render a LoadingRow after this parent
  return (
    <>
      <GridRow key={row.id} ... />
      <LoadingRow
        key={`${row.id}-loading`}
        depth={row.depth + 1}
        error={lazyTree.getError(row.id)?.message}
        onRetry={() => lazyTree.retry(row.id)}
      />
    </>
  );
}
```

- [ ] **Step 3: Export useLazyTree from data barrel**

Add to `src/data/index.ts`:

```ts
export { useLazyTree } from './use-lazy-tree';
export type { UseLazyTreeReturn } from './use-lazy-tree';
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
git commit -m "feat(m4): wire lazy tree loading into DataGrid expand handler"
```
