# Strata M4 · Plan 8 — Where-Used / Reverse BOM · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement where-used (reverse BOM explosion) — given a component, find all parent assemblies that use it. Exposed via `GridApi.whereUsed()`, a context menu action, and a `WhereUsedDialog` showing results.

**Architecture:** A `useWhereUsed` hook manages the query lifecycle (loading, results, error). For server-side data sources, it calls `dataSource.whereUsed(nodeId)`. For in-memory data, it traverses the tree to find all parents. The `WhereUsedDialog` displays results as a list of paths from root to the usage point.

**Tech Stack:** TypeScript, React 18/19, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-23-strata-m4-scale-enterprise-design.md` (§3.8, §5.2).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/data/where-used.ts` | create | In-memory where-used traversal |
| `src/data/where-used.test.ts` | create | Where-used traversal tests |
| `src/data/use-where-used.ts` | create | Where-used query hook |
| `src/data/use-where-used.test.ts` | create | Hook tests |
| `src/components/WhereUsedDialog.tsx` | create | Results dialog component |
| `src/components/WhereUsedDialog.test.tsx` | create | Dialog component tests |

---

## Task 1: In-memory where-used traversal

A pure function that finds all parent assemblies for a given node in an in-memory tree.

**Files:**
- Create: `src/data/where-used.ts`
- Create: `src/data/where-used.test.ts`

- [ ] **Step 1: Write failing tests — `src/data/where-used.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { findWhereUsed } from './where-used';
import type { WhereUsedResult } from './types';

interface Row { id: string; name: string; parentId: string | null; qty?: number }

const tree: Row[] = [
  { id: 'A', name: 'Assembly A', parentId: null },
  { id: 'B', name: 'Assembly B', parentId: null },
  { id: 'C', name: 'Sub-assembly C', parentId: 'A', qty: 2 },
  { id: 'D', name: 'Component D', parentId: 'C', qty: 3 },
  { id: 'E', name: 'Component D copy', parentId: 'B', qty: 1 },
  { id: 'F', name: 'Component F', parentId: 'A', qty: 5 },
];

const getRowId = (r: Row) => r.id;
const getParentId = (r: Row) => r.parentId;

describe('findWhereUsed', () => {
  it('finds direct parents of a leaf node', () => {
    const results = findWhereUsed(tree, 'D', getRowId, getParentId);
    expect(results).toHaveLength(1);
    expect(results[0].parentNode.id).toBe('C');
    expect(results[0].path.map((r) => r.id)).toEqual(['A', 'C']);
  });

  it('finds multiple usages when a component appears in multiple assemblies', () => {
    // Simulate D appearing under both C and B by searching for nodes with same name
    // In this test, E is a separate node under B
    const results = findWhereUsed(tree, 'F', getRowId, getParentId);
    expect(results).toHaveLength(1);
    expect(results[0].parentNode.id).toBe('A');
    expect(results[0].path.map((r) => r.id)).toEqual(['A']);
  });

  it('returns empty for root nodes', () => {
    const results = findWhereUsed(tree, 'A', getRowId, getParentId);
    expect(results).toHaveLength(0);
  });

  it('returns empty for non-existent nodes', () => {
    const results = findWhereUsed(tree, 'Z', getRowId, getParentId);
    expect(results).toHaveLength(0);
  });

  it('builds the full path from root to parent', () => {
    const results = findWhereUsed(tree, 'D', getRowId, getParentId);
    // D's parent is C, C's parent is A (root)
    expect(results[0].path).toHaveLength(2);
    expect(results[0].path[0].id).toBe('A');
    expect(results[0].path[1].id).toBe('C');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/where-used.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/data/where-used.ts`**

```ts
import type { WhereUsedResult } from './types';

/**
 * Finds all parent assemblies that directly contain a given node.
 * Traverses the in-memory tree to build paths from root to each usage.
 *
 * @param rows - All rows in the tree
 * @param nodeId - The node to find usages of
 * @param getRowId - Function to extract row id
 * @param getParentId - Function to extract parent id
 * @returns Array of where-used results with parent and path
 */
export function findWhereUsed<TRow>(
  rows: TRow[],
  nodeId: string,
  getRowId: (row: TRow) => string,
  getParentId: (row: TRow) => string | null | undefined,
): WhereUsedResult<TRow>[] {
  // Build lookup maps
  const rowById = new Map<string, TRow>();
  for (const row of rows) {
    rowById.set(getRowId(row), row);
  }

  // Find the target node
  const targetNode = rowById.get(nodeId);
  if (!targetNode) return [];

  // Get the direct parent
  const parentId = getParentId(targetNode);
  if (!parentId) return []; // Root node — no parents

  const parentNode = rowById.get(parentId);
  if (!parentNode) return [];

  // Build path from root to parent
  const path = buildPathToRoot(parentId, rowById, getRowId, getParentId);

  return [{ parentNode, path }];
}

/**
 * Builds the path from root to a given node (inclusive).
 * Returns ancestors in order from root to the node.
 */
function buildPathToRoot<TRow>(
  nodeId: string,
  rowById: Map<string, TRow>,
  getRowId: (row: TRow) => string,
  getParentId: (row: TRow) => string | null | undefined,
): TRow[] {
  const path: TRow[] = [];
  let currentId: string | null | undefined = nodeId;

  while (currentId) {
    const node = rowById.get(currentId);
    if (!node) break;
    path.unshift(node);
    currentId = getParentId(node);
  }

  return path;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/data/where-used.test.ts`
Expected: PASS — all tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/data/where-used.ts src/data/where-used.test.ts
git commit -m "feat(m4): add in-memory where-used traversal"
```

---

## Task 2: useWhereUsed hook

Manages the where-used query lifecycle — calls server or in-memory implementation, tracks loading/error state.

**Files:**
- Create: `src/data/use-where-used.ts`
- Create: `src/data/use-where-used.test.ts`

- [ ] **Step 1: Write failing tests — `src/data/use-where-used.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWhereUsed } from './use-where-used';
import type { DataSource } from './data-source';
import type { WhereUsedResult } from './types';

interface Row { id: string; name: string; parentId: string | null }

const mockResults: WhereUsedResult<Row>[] = [
  {
    parentNode: { id: 'A', name: 'Assembly A', parentId: null },
    path: [{ id: 'A', name: 'Assembly A', parentId: null }],
  },
];

describe('useWhereUsed — server-side', () => {
  it('calls dataSource.whereUsed when available', async () => {
    const whereUsedFn = vi.fn(() => Promise.resolve(mockResults));
    const ds: DataSource<Row> = {
      load: () => [],
      whereUsed: whereUsedFn,
      capabilities: () => ({ whereUsed: true }),
    };

    const { result } = renderHook(() => useWhereUsed(ds, [], (r) => r.id, (r) => r.parentId));

    act(() => {
      result.current.query('D');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(whereUsedFn).toHaveBeenCalledWith('D');
    expect(result.current.results).toEqual(mockResults);
  });
});

describe('useWhereUsed — in-memory fallback', () => {
  it('uses in-memory traversal when dataSource.whereUsed is not available', async () => {
    const rows: Row[] = [
      { id: 'A', name: 'Assembly A', parentId: null },
      { id: 'B', name: 'Component B', parentId: 'A' },
    ];
    const ds: DataSource<Row> = { load: () => rows };

    const { result } = renderHook(() =>
      useWhereUsed(ds, rows, (r) => r.id, (r) => r.parentId),
    );

    act(() => {
      result.current.query('B');
    });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].parentNode.id).toBe('A');
  });
});

describe('useWhereUsed — error handling', () => {
  it('captures errors from server', async () => {
    const ds: DataSource<Row> = {
      load: () => [],
      whereUsed: () => Promise.reject(new Error('Not found')),
      capabilities: () => ({ whereUsed: true }),
    };

    const { result } = renderHook(() => useWhereUsed(ds, [], (r) => r.id, (r) => r.parentId));

    act(() => {
      result.current.query('X');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe('Not found');
  });
});
```

- [ ] **Step 2: Create `src/data/use-where-used.ts`**

```ts
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
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/data/use-where-used.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/data/use-where-used.ts src/data/use-where-used.test.ts
git commit -m "feat(m4): add useWhereUsed hook with server/in-memory support"
```

---

## Task 3: WhereUsedDialog component

A dialog/panel showing where-used results — each result shows the path from root to the parent assembly.

**Files:**
- Create: `src/components/WhereUsedDialog.tsx`
- Create: `src/components/WhereUsedDialog.test.tsx`

- [ ] **Step 1: Create `src/components/WhereUsedDialog.tsx`**

```tsx
import type { ReactNode } from 'react';
import type { WhereUsedResult } from '../data/types';

export interface WhereUsedDialogProps<TRow> {
  /** The node being queried. */
  nodeLabel: string;
  /** Query results. */
  results: WhereUsedResult<TRow>[];
  /** Whether the query is loading. */
  isLoading: boolean;
  /** Error message. */
  error?: string;
  /** How to render a node label in the path. */
  renderNodeLabel: (node: TRow) => ReactNode;
  /** Close handler. */
  onClose: () => void;
  /** Navigate to a result (e.g., scroll to row). */
  onNavigate?: (result: WhereUsedResult<TRow>) => void;
}

export function WhereUsedDialog<TRow>({
  nodeLabel,
  results,
  isLoading,
  error,
  renderNodeLabel,
  onClose,
  onNavigate,
}: WhereUsedDialogProps<TRow>) {
  return (
    <div className="strata-where-used-dialog" role="dialog" aria-label={`Where used: ${nodeLabel}`}>
      <div className="strata-where-used-header">
        <h3 className="strata-where-used-title">Where used: {nodeLabel}</h3>
        <button onClick={onClose} aria-label="Close" className="strata-where-used-close">
          ×
        </button>
      </div>

      <div className="strata-where-used-body">
        {isLoading && <div className="strata-where-used-loading">Searching...</div>}

        {error && <div className="strata-where-used-error">{error}</div>}

        {!isLoading && !error && results.length === 0 && (
          <div className="strata-where-used-empty">
            No parent assemblies found.
          </div>
        )}

        {results.length > 0 && (
          <ul className="strata-where-used-results">
            {results.map((result, index) => (
              <li key={index} className="strata-where-used-result">
                <button
                  className="strata-where-used-result-btn"
                  onClick={() => onNavigate?.(result)}
                >
                  <span className="strata-where-used-path">
                    {result.path.map((node, i) => (
                      <span key={i} className="strata-where-used-path-node">
                        {i > 0 && <span className="strata-where-used-separator"> › </span>}
                        {renderNodeLabel(node)}
                      </span>
                    ))}
                  </span>
                  {result.quantity != null && (
                    <span className="strata-where-used-qty">Qty: {result.quantity}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write tests — `src/components/WhereUsedDialog.test.tsx`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WhereUsedDialog } from './WhereUsedDialog';
import type { WhereUsedResult } from '../data/types';

interface Row { id: string; name: string }

const results: WhereUsedResult<Row>[] = [
  {
    parentNode: { id: 'A', name: 'Assembly A' },
    path: [{ id: 'A', name: 'Assembly A' }],
    quantity: 3,
  },
];

describe('WhereUsedDialog', () => {
  it('renders the node label in the title', () => {
    render(
      <WhereUsedDialog
        nodeLabel="Bolt M6"
        results={results}
        isLoading={false}
        renderNodeLabel={(n) => n.name}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/Where used: Bolt M6/)).toBeInTheDocument();
  });

  it('renders results with path', () => {
    render(
      <WhereUsedDialog
        nodeLabel="Bolt M6"
        results={results}
        isLoading={false}
        renderNodeLabel={(n) => n.name}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Assembly A')).toBeInTheDocument();
    expect(screen.getByText('Qty: 3')).toBeInTheDocument();
  });

  it('shows empty state when no results', () => {
    render(
      <WhereUsedDialog
        nodeLabel="Bolt M6"
        results={[]}
        isLoading={false}
        renderNodeLabel={(n) => n.name}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/No parent assemblies found/)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <WhereUsedDialog
        nodeLabel="Bolt M6"
        results={[]}
        isLoading={true}
        renderNodeLabel={(n) => n.name}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <WhereUsedDialog
        nodeLabel="Bolt M6"
        results={results}
        isLoading={false}
        renderNodeLabel={(n) => n.name}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/components/WhereUsedDialog.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/WhereUsedDialog.tsx src/components/WhereUsedDialog.test.tsx src/data/where-used.ts src/data/where-used.test.ts src/data/use-where-used.ts src/data/use-where-used.test.ts
git commit -m "feat(m4): add WhereUsedDialog and where-used infrastructure"
```
