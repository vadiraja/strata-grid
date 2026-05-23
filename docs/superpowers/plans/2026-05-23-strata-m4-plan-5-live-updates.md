# Strata M4 · Plan 5 — Live / Streaming Updates · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement live data updates via `DataSource.subscribe()`. The grid reconciles incoming add/update/delete/refresh events into its current state without disrupting the user's scroll position or active edit.

**Architecture:** A `useLiveUpdates` hook subscribes to the data source on mount and processes `DataChangeEvent` objects. It reconciles changes into the grid's row data: inserts new rows at the correct sorted position, patches updated rows, removes deleted rows and their subtrees, and triggers a full reload on refresh events. Updates that arrive during an active edit are queued and applied after the edit commits/discards.

**Tech Stack:** TypeScript, React 18/19, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-23-strata-m4-scale-enterprise-design.md` (§3.5, §6 — live update flow).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/data/use-live-updates.ts` | create | Live update subscription and reconciliation hook |
| `src/data/use-live-updates.test.ts` | create | Unit tests for live update reconciliation |
| `src/data/reconcile-changes.ts` | create | Pure function for reconciling DataChangeEvent into row data |
| `src/data/reconcile-changes.test.ts` | create | Unit tests for reconciliation logic |
| `src/components/DataGrid.tsx` | modify | Wire live updates |
| `src/data/index.ts` | modify | Export new modules |

---

## Task 1: Reconciliation logic

A pure function that takes current rows + a `DataChangeEvent` and returns the new row array. Separated from the hook for easy unit testing.

**Files:**
- Create: `src/data/reconcile-changes.ts`
- Create: `src/data/reconcile-changes.test.ts`

- [ ] **Step 1: Write failing tests — `src/data/reconcile-changes.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { reconcileChanges } from './reconcile-changes';
import type { DataChangeEvent } from './types';

interface Row { id: string; name: string; parentId: string | null }

const baseRows: Row[] = [
  { id: '1', name: 'Alice', parentId: null },
  { id: '2', name: 'Bob', parentId: null },
  { id: '3', name: 'Charlie', parentId: '1' },
];

const getRowId = (r: Row) => r.id;
const getParentId = (r: Row) => r.parentId;

describe('reconcileChanges — add', () => {
  it('adds new rows to the end', () => {
    const event: DataChangeEvent<Row> = {
      type: 'add',
      rows: [{ id: '4', data: { id: '4', name: 'Dave', parentId: null } }],
    };
    const result = reconcileChanges(baseRows, event, getRowId);
    expect(result).toHaveLength(4);
    expect(result[3]).toEqual({ id: '4', name: 'Dave', parentId: null });
  });

  it('adds child rows under parent', () => {
    const event: DataChangeEvent<Row> = {
      type: 'add',
      rows: [{ id: '5', data: { id: '5', name: 'Eve', parentId: '1' }, parentId: '1' }],
    };
    const result = reconcileChanges(baseRows, event, getRowId);
    expect(result).toHaveLength(4);
    expect(result.find((r) => r.id === '5')?.parentId).toBe('1');
  });
});

describe('reconcileChanges — update', () => {
  it('patches existing row data', () => {
    const event: DataChangeEvent<Row> = {
      type: 'update',
      rows: [{ id: '1', data: { id: '1', name: 'Alice Updated', parentId: null } }],
    };
    const result = reconcileChanges(baseRows, event, getRowId);
    expect(result).toHaveLength(3);
    expect(result.find((r) => r.id === '1')?.name).toBe('Alice Updated');
  });

  it('ignores updates for non-existent rows', () => {
    const event: DataChangeEvent<Row> = {
      type: 'update',
      rows: [{ id: '99', data: { id: '99', name: 'Ghost', parentId: null } }],
    };
    const result = reconcileChanges(baseRows, event, getRowId);
    expect(result).toEqual(baseRows);
  });
});

describe('reconcileChanges — delete', () => {
  it('removes the specified row', () => {
    const event: DataChangeEvent<Row> = {
      type: 'delete',
      rows: [{ id: '2' }],
    };
    const result = reconcileChanges(baseRows, event, getRowId);
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.id === '2')).toBeUndefined();
  });

  it('removes a parent and its children', () => {
    const event: DataChangeEvent<Row> = {
      type: 'delete',
      rows: [{ id: '1' }],
    };
    const result = reconcileChanges(baseRows, event, getRowId, getParentId);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
    // Child '3' (parentId: '1') should also be removed
  });
});

describe('reconcileChanges — refresh', () => {
  it('returns null to signal a full reload is needed', () => {
    const event: DataChangeEvent<Row> = { type: 'refresh' };
    const result = reconcileChanges(baseRows, event, getRowId);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/reconcile-changes.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/data/reconcile-changes.ts`**

```ts
import type { DataChangeEvent } from './types';

/**
 * Reconciles a DataChangeEvent into the current row array.
 *
 * Returns the new row array, or `null` if a full reload is needed (refresh event).
 *
 * @param rows - Current row data
 * @param event - The change event from the data source
 * @param getRowId - Function to extract row id
 * @param getParentId - Optional function to extract parent id (for cascade delete)
 */
export function reconcileChanges<TRow>(
  rows: TRow[],
  event: DataChangeEvent<TRow>,
  getRowId: (row: TRow) => string,
  getParentId?: (row: TRow) => string | null | undefined,
): TRow[] | null {
  switch (event.type) {
    case 'add': {
      if (!event.rows) return rows;
      const newRows = event.rows
        .filter((r) => r.data != null)
        .map((r) => r.data as TRow);
      return [...rows, ...newRows];
    }

    case 'update': {
      if (!event.rows) return rows;
      const updateMap = new Map<string, TRow>();
      for (const r of event.rows) {
        if (r.data != null) {
          updateMap.set(r.id, r.data);
        }
      }
      if (updateMap.size === 0) return rows;

      return rows.map((row) => {
        const updated = updateMap.get(getRowId(row));
        return updated ?? row;
      });
    }

    case 'delete': {
      if (!event.rows) return rows;
      const deleteIds = new Set(event.rows.map((r) => r.id));

      // If we have getParentId, cascade delete children
      if (getParentId) {
        // Find all descendants of deleted nodes
        let changed = true;
        while (changed) {
          changed = false;
          for (const row of rows) {
            const id = getRowId(row);
            const parentId = getParentId(row);
            if (parentId && deleteIds.has(parentId) && !deleteIds.has(id)) {
              deleteIds.add(id);
              changed = true;
            }
          }
        }
      }

      return rows.filter((row) => !deleteIds.has(getRowId(row)));
    }

    case 'refresh':
      return null;

    default:
      return rows;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/data/reconcile-changes.test.ts`
Expected: PASS — all tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/data/reconcile-changes.ts src/data/reconcile-changes.test.ts
git commit -m "feat(m4): add reconcileChanges for live update processing"
```

---

## Task 2: useLiveUpdates hook

Subscribes to the data source, processes incoming events, queues updates during active edits, and provides the reconciled data.

**Files:**
- Create: `src/data/use-live-updates.ts`
- Create: `src/data/use-live-updates.test.ts`

- [ ] **Step 1: Write failing tests — `src/data/use-live-updates.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLiveUpdates } from './use-live-updates';
import type { DataSource } from './data-source';
import type { DataChangeHandler, DataChangeEvent } from './types';

interface Row { id: string; name: string }

function createLiveDS(): {
  ds: DataSource<Row>;
  emit: (event: DataChangeEvent<Row>) => void;
} {
  let handler: DataChangeHandler<Row> | null = null;
  const ds: DataSource<Row> = {
    load: () => [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ],
    subscribe: (onChange) => {
      handler = onChange;
      return () => { handler = null; };
    },
    capabilities: () => ({ liveUpdates: true }),
  };
  const emit = (event: DataChangeEvent<Row>) => {
    handler?.(event);
  };
  return { ds, emit };
}

describe('useLiveUpdates — subscription', () => {
  it('subscribes on mount and unsubscribes on unmount', () => {
    const { ds } = createLiveDS();
    const subscribeSpy = vi.spyOn(ds, 'subscribe');
    const { unmount } = renderHook(() =>
      useLiveUpdates(ds, [{ id: '1', name: 'Alice' }], (r) => r.id),
    );
    expect(subscribeSpy).toHaveBeenCalledTimes(1);
    unmount();
    // Unsubscribe was called (the returned function)
  });
});

describe('useLiveUpdates — reconciliation', () => {
  it('adds rows on add event', () => {
    const { ds, emit } = createLiveDS();
    const { result } = renderHook(() =>
      useLiveUpdates(ds, [{ id: '1', name: 'Alice' }], (r) => r.id),
    );

    act(() => {
      emit({
        type: 'add',
        rows: [{ id: '3', data: { id: '3', name: 'Charlie' } }],
      });
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[1].name).toBe('Charlie');
  });

  it('updates rows on update event', () => {
    const { ds, emit } = createLiveDS();
    const { result } = renderHook(() =>
      useLiveUpdates(ds, [{ id: '1', name: 'Alice' }], (r) => r.id),
    );

    act(() => {
      emit({
        type: 'update',
        rows: [{ id: '1', data: { id: '1', name: 'Alice Updated' } }],
      });
    });

    expect(result.current.data[0].name).toBe('Alice Updated');
  });

  it('removes rows on delete event', () => {
    const { ds, emit } = createLiveDS();
    const { result } = renderHook(() =>
      useLiveUpdates(
        ds,
        [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }],
        (r) => r.id,
      ),
    );

    act(() => {
      emit({ type: 'delete', rows: [{ id: '1' }] });
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].id).toBe('2');
  });
});

describe('useLiveUpdates — edit queueing', () => {
  it('queues updates while editing and applies after', () => {
    const { ds, emit } = createLiveDS();
    const { result } = renderHook(() =>
      useLiveUpdates(ds, [{ id: '1', name: 'Alice' }], (r) => r.id),
    );

    // Start editing
    act(() => {
      result.current.setEditing(true);
    });

    // Emit an update while editing
    act(() => {
      emit({
        type: 'update',
        rows: [{ id: '1', data: { id: '1', name: 'Alice Live' } }],
      });
    });

    // Data should NOT be updated yet
    expect(result.current.data[0].name).toBe('Alice');
    expect(result.current.pendingCount).toBe(1);

    // Stop editing — queued updates apply
    act(() => {
      result.current.setEditing(false);
    });

    expect(result.current.data[0].name).toBe('Alice Live');
    expect(result.current.pendingCount).toBe(0);
  });
});

describe('useLiveUpdates — refresh', () => {
  it('signals refresh needed on refresh event', () => {
    const { ds, emit } = createLiveDS();
    const onRefresh = vi.fn();
    renderHook(() =>
      useLiveUpdates(
        ds,
        [{ id: '1', name: 'Alice' }],
        (r) => r.id,
        { onRefreshNeeded: onRefresh },
      ),
    );

    act(() => {
      emit({ type: 'refresh' });
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/use-live-updates.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/data/use-live-updates.ts`**

```ts
import { useState, useEffect, useCallback, useRef } from 'react';
import type { DataSource } from './data-source';
import type { DataChangeEvent } from './types';
import { reconcileChanges } from './reconcile-changes';

export interface UseLiveUpdatesOptions {
  /** Called when a 'refresh' event is received (full reload needed). */
  onRefreshNeeded?: () => void;
  /** Function to get parent id for cascade delete. */
  getParentId?: (row: unknown) => string | null | undefined;
}

export interface UseLiveUpdatesReturn<TRow> {
  /** Current data with live updates applied. */
  data: TRow[];
  /** Number of queued updates (during editing). */
  pendingCount: number;
  /** Set whether the grid is in editing mode (queues updates). */
  setEditing: (editing: boolean) => void;
}

/**
 * Hook that subscribes to live data changes and reconciles them into the grid state.
 *
 * - Subscribes to `dataSource.subscribe()` on mount.
 * - Reconciles add/update/delete events immediately.
 * - Queues events while the user is editing; applies them when editing ends.
 * - Signals refresh-needed for full reload events.
 */
export function useLiveUpdates<TRow>(
  dataSource: DataSource<TRow>,
  initialData: TRow[],
  getRowId: (row: TRow) => string,
  options: UseLiveUpdatesOptions = {},
): UseLiveUpdatesReturn<TRow> {
  const { onRefreshNeeded, getParentId } = options;

  const [data, setData] = useState<TRow[]>(initialData);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const queueRef = useRef<DataChangeEvent<TRow>[]>([]);
  const dataRef = useRef(data);
  dataRef.current = data;
  const isEditingRef = useRef(isEditing);
  isEditingRef.current = isEditing;

  // Update data when initialData changes
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Subscribe to live updates
  useEffect(() => {
    if (!dataSource.subscribe) return;

    const unsubscribe = dataSource.subscribe((event: DataChangeEvent<TRow>) => {
      if (isEditingRef.current) {
        // Queue the event
        queueRef.current.push(event);
        setPendingCount((c) => c + 1);
        return;
      }

      // Apply immediately
      const result = reconcileChanges(
        dataRef.current,
        event,
        getRowId,
        getParentId as ((row: TRow) => string | null | undefined) | undefined,
      );

      if (result === null) {
        // Refresh needed
        onRefreshNeeded?.();
      } else {
        setData(result);
      }
    });

    return unsubscribe;
  }, [dataSource, getRowId, getParentId, onRefreshNeeded]);

  // Apply queued events when editing ends
  const setEditing = useCallback(
    (editing: boolean) => {
      setIsEditing(editing);

      if (!editing && queueRef.current.length > 0) {
        // Apply all queued events
        let current = dataRef.current;
        for (const event of queueRef.current) {
          const result = reconcileChanges(
            current,
            event,
            getRowId,
            getParentId as ((row: TRow) => string | null | undefined) | undefined,
          );
          if (result === null) {
            onRefreshNeeded?.();
            break;
          }
          current = result;
        }
        setData(current);
        queueRef.current = [];
        setPendingCount(0);
      }
    },
    [getRowId, getParentId, onRefreshNeeded],
  );

  return { data, pendingCount, setEditing };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/data/use-live-updates.test.ts`
Expected: PASS — all tests passing.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/data/use-live-updates.ts src/data/use-live-updates.test.ts
git commit -m "feat(m4): add useLiveUpdates hook for streaming data reconciliation"
```

---

## Task 3: Wire live updates into DataGrid and export

**Files:**
- Modify: `src/components/DataGrid.tsx`
- Modify: `src/data/index.ts`

- [ ] **Step 1: Wire useLiveUpdates into DataGrid when data source supports it**

```ts
import { useLiveUpdates } from '../data/use-live-updates';

// Inside DataGrid:
const liveUpdates = useLiveUpdates(dataSource, rows, getRowId, {
  onRefreshNeeded: () => serverDS.refresh(),
  getParentId: treeData?.getParentId,
});

// Use liveUpdates.data as the row source when live updates are active
const effectiveRows = capabilities.liveUpdates ? liveUpdates.data : rows;

// Connect editing state to live updates
// When edit starts: liveUpdates.setEditing(true)
// When edit ends: liveUpdates.setEditing(false)
```

- [ ] **Step 2: Export from data barrel**

Add to `src/data/index.ts`:

```ts
export { useLiveUpdates } from './use-live-updates';
export type { UseLiveUpdatesOptions, UseLiveUpdatesReturn } from './use-live-updates';
export { reconcileChanges } from './reconcile-changes';
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/components/DataGrid.tsx src/data/index.ts
git commit -m "feat(m4): wire live updates into DataGrid"
```
