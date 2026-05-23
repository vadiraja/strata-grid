# Strata M4 · Plan 9 — Column Management & View State · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a column management panel (show/hide/reorder/reset columns) and persisted view state (save/restore column order, widths, pinning, sort, filter, expanded nodes). Enables users to customize their grid layout and persist it across sessions.

**Architecture:** A `useColumnManagement` hook manages column visibility and order. A `ColumnManagementPanel` component provides the UI (checkboxes, drag-to-reorder, search, reset). A `useViewState` hook serializes/restores the full grid configuration. `GridApi` gains `exportViewState()` and `importViewState()` methods.

**Tech Stack:** TypeScript, React 18/19, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-23-strata-m4-scale-enterprise-design.md` (§3.9, §3.10, §5.2).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/model/use-column-management.ts` | create | Column visibility/order management |
| `src/model/use-column-management.test.ts` | create | Column management tests |
| `src/model/use-view-state.ts` | create | View state serialization/restoration |
| `src/model/use-view-state.test.ts` | create | View state tests |
| `src/model/view-state-types.ts` | create | ViewState interface |
| `src/components/ColumnManagementPanel.tsx` | create | Column management UI |
| `src/components/ColumnManagementPanel.test.tsx` | create | Panel component tests |
| `src/components/DataGrid.tsx` | modify | Wire column management and view state |

---

## Task 1: ViewState types

**Files:**
- Create: `src/model/view-state-types.ts`

- [ ] **Step 1: Create `src/model/view-state-types.ts`**

```ts
import type { ColumnSort } from './types';
import type { FilterExpression } from '../data/types';

/**
 * Serializable grid view state for persistence.
 * Contains all user-configurable aspects of the grid layout.
 */
export interface ViewState {
  /** Column order (array of column ids). */
  columnOrder: string[];
  /** Column widths keyed by column id. */
  columnSizing: Record<string, number>;
  /** Pinned columns. */
  columnPinning: { left: string[]; right: string[] };
  /** Current sort state. */
  sorting: ColumnSort[];
  /** Current filter expressions. */
  filters: FilterExpression[];
  /** Expanded node ids (tree mode). */
  expandedIds: string[];
  /** Hidden column ids. */
  hiddenColumns: string[];
  /** Global search term. */
  searchTerm?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/model/view-state-types.ts
git commit -m "feat(m4): add ViewState type for grid state persistence"
```

---

## Task 2: useColumnManagement hook

Manages column visibility (show/hide), order, and reset-to-default.

**Files:**
- Create: `src/model/use-column-management.ts`
- Create: `src/model/use-column-management.test.ts`

- [ ] **Step 1: Write failing tests — `src/model/use-column-management.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColumnManagement } from './use-column-management';

const allColumns = [
  { id: 'name', header: 'Name' },
  { id: 'age', header: 'Age' },
  { id: 'city', header: 'City' },
  { id: 'role', header: 'Role' },
];

describe('useColumnManagement — initial state', () => {
  it('starts with all columns visible', () => {
    const { result } = renderHook(() =>
      useColumnManagement({ columns: allColumns }),
    );
    expect(result.current.visibleColumns).toHaveLength(4);
    expect(result.current.hiddenColumns).toHaveLength(0);
  });

  it('respects initial hidden columns', () => {
    const { result } = renderHook(() =>
      useColumnManagement({ columns: allColumns, initialHidden: ['city', 'role'] }),
    );
    expect(result.current.visibleColumns).toHaveLength(2);
    expect(result.current.hiddenColumns).toEqual(['city', 'role']);
  });
});

describe('useColumnManagement — hide/show', () => {
  it('hides a column', () => {
    const { result } = renderHook(() =>
      useColumnManagement({ columns: allColumns }),
    );
    act(() => { result.current.hideColumn('age'); });
    expect(result.current.hiddenColumns).toContain('age');
    expect(result.current.visibleColumns.find((c) => c.id === 'age')).toBeUndefined();
  });

  it('shows a hidden column', () => {
    const { result } = renderHook(() =>
      useColumnManagement({ columns: allColumns, initialHidden: ['age'] }),
    );
    act(() => { result.current.showColumn('age'); });
    expect(result.current.hiddenColumns).not.toContain('age');
  });

  it('prevents hiding the last visible column', () => {
    const { result } = renderHook(() =>
      useColumnManagement({ columns: [{ id: 'name', header: 'Name' }] }),
    );
    act(() => { result.current.hideColumn('name'); });
    // Should still be visible
    expect(result.current.visibleColumns).toHaveLength(1);
  });

  it('respects alwaysVisible columns', () => {
    const { result } = renderHook(() =>
      useColumnManagement({ columns: allColumns, alwaysVisible: ['name'] }),
    );
    act(() => { result.current.hideColumn('name'); });
    expect(result.current.visibleColumns.find((c) => c.id === 'name')).toBeDefined();
  });
});

describe('useColumnManagement — reorder', () => {
  it('moves a column to a new position', () => {
    const { result } = renderHook(() =>
      useColumnManagement({ columns: allColumns }),
    );
    act(() => { result.current.moveColumn('city', 0); });
    expect(result.current.columnOrder[0]).toBe('city');
  });
});

describe('useColumnManagement — reset', () => {
  it('resets to default order and visibility', () => {
    const { result } = renderHook(() =>
      useColumnManagement({ columns: allColumns }),
    );
    act(() => {
      result.current.hideColumn('age');
      result.current.moveColumn('city', 0);
    });
    act(() => { result.current.reset(); });
    expect(result.current.hiddenColumns).toHaveLength(0);
    expect(result.current.columnOrder).toEqual(['name', 'age', 'city', 'role']);
  });
});

describe('useColumnManagement — search', () => {
  it('filters columns by search term', () => {
    const { result } = renderHook(() =>
      useColumnManagement({ columns: allColumns }),
    );
    const filtered = result.current.searchColumns('ag');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('age');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/model/use-column-management.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/model/use-column-management.ts`**

```ts
import { useState, useCallback, useMemo } from 'react';

export interface ColumnInfo {
  id: string;
  header: string;
}

export interface UseColumnManagementOptions {
  /** All available columns. */
  columns: ColumnInfo[];
  /** Initially hidden column ids. */
  initialHidden?: string[];
  /** Columns that cannot be hidden. */
  alwaysVisible?: string[];
}

export interface UseColumnManagementReturn {
  /** Currently visible columns in order. */
  visibleColumns: ColumnInfo[];
  /** Hidden column ids. */
  hiddenColumns: string[];
  /** Current column order (all columns). */
  columnOrder: string[];
  /** Hide a column. */
  hideColumn: (columnId: string) => void;
  /** Show a hidden column. */
  showColumn: (columnId: string) => void;
  /** Toggle column visibility. */
  toggleColumn: (columnId: string) => void;
  /** Move a column to a new index. */
  moveColumn: (columnId: string, toIndex: number) => void;
  /** Reset to default order and visibility. */
  reset: () => void;
  /** Search columns by header text. */
  searchColumns: (term: string) => ColumnInfo[];
  /** Whether a column is visible. */
  isVisible: (columnId: string) => boolean;
}

export function useColumnManagement(
  options: UseColumnManagementOptions,
): UseColumnManagementReturn {
  const { columns, initialHidden = [], alwaysVisible = [] } = options;

  const defaultOrder = useMemo(() => columns.map((c) => c.id), [columns]);

  const [columnOrder, setColumnOrder] = useState<string[]>(defaultOrder);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(initialHidden);

  const visibleColumns = useMemo(
    () =>
      columnOrder
        .filter((id) => !hiddenColumns.includes(id))
        .map((id) => columns.find((c) => c.id === id)!)
        .filter(Boolean),
    [columnOrder, hiddenColumns, columns],
  );

  const hideColumn = useCallback(
    (columnId: string) => {
      // Prevent hiding always-visible columns
      if (alwaysVisible.includes(columnId)) return;

      setHiddenColumns((prev) => {
        // Prevent hiding the last visible column
        const visibleCount = columnOrder.filter((id) => !prev.includes(id)).length;
        if (visibleCount <= 1) return prev;
        if (prev.includes(columnId)) return prev;
        return [...prev, columnId];
      });
    },
    [alwaysVisible, columnOrder],
  );

  const showColumn = useCallback((columnId: string) => {
    setHiddenColumns((prev) => prev.filter((id) => id !== columnId));
  }, []);

  const toggleColumn = useCallback(
    (columnId: string) => {
      if (hiddenColumns.includes(columnId)) {
        showColumn(columnId);
      } else {
        hideColumn(columnId);
      }
    },
    [hiddenColumns, showColumn, hideColumn],
  );

  const moveColumn = useCallback((columnId: string, toIndex: number) => {
    setColumnOrder((prev) => {
      const next = prev.filter((id) => id !== columnId);
      next.splice(toIndex, 0, columnId);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setColumnOrder(defaultOrder);
    setHiddenColumns([]);
  }, [defaultOrder]);

  const searchColumns = useCallback(
    (term: string) => {
      const lower = term.toLowerCase();
      return columns.filter((c) =>
        (typeof c.header === 'string' ? c.header : c.id)
          .toLowerCase()
          .includes(lower),
      );
    },
    [columns],
  );

  const isVisible = useCallback(
    (columnId: string) => !hiddenColumns.includes(columnId),
    [hiddenColumns],
  );

  return {
    visibleColumns,
    hiddenColumns,
    columnOrder,
    hideColumn,
    showColumn,
    toggleColumn,
    moveColumn,
    reset,
    searchColumns,
    isVisible,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/model/use-column-management.test.ts`
Expected: PASS — all tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/model/use-column-management.ts src/model/use-column-management.test.ts
git commit -m "feat(m4): add useColumnManagement hook"
```

---

## Task 3: useViewState hook

Serializes and restores the full grid view configuration.

**Files:**
- Create: `src/model/use-view-state.ts`
- Create: `src/model/use-view-state.test.ts`

- [ ] **Step 1: Write failing tests — `src/model/use-view-state.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewState } from './use-view-state';
import type { ViewState } from './view-state-types';

const mockState: ViewState = {
  columnOrder: ['name', 'age', 'city'],
  columnSizing: { name: 200, age: 100 },
  columnPinning: { left: ['name'], right: [] },
  sorting: [{ columnId: 'name', direction: 'asc' }],
  filters: [],
  expandedIds: ['row-1', 'row-2'],
  hiddenColumns: ['city'],
};

describe('useViewState — export', () => {
  it('exports current state', () => {
    const { result } = renderHook(() =>
      useViewState({
        getColumnOrder: () => mockState.columnOrder,
        getColumnSizing: () => mockState.columnSizing,
        getColumnPinning: () => mockState.columnPinning,
        getSorting: () => mockState.sorting,
        getFilters: () => mockState.filters,
        getExpandedIds: () => mockState.expandedIds,
        getHiddenColumns: () => mockState.hiddenColumns,
      }),
    );

    const exported = result.current.exportState();
    expect(exported).toEqual(mockState);
  });
});

describe('useViewState — import', () => {
  it('calls all setters with imported state', () => {
    const setColumnOrder = vi.fn();
    const setColumnSizing = vi.fn();
    const setColumnPinning = vi.fn();
    const setSorting = vi.fn();
    const setFilters = vi.fn();
    const setExpandedIds = vi.fn();
    const setHiddenColumns = vi.fn();

    const { result } = renderHook(() =>
      useViewState({
        getColumnOrder: () => [],
        getColumnSizing: () => ({}),
        getColumnPinning: () => ({ left: [], right: [] }),
        getSorting: () => [],
        getFilters: () => [],
        getExpandedIds: () => [],
        getHiddenColumns: () => [],
        setColumnOrder,
        setColumnSizing,
        setColumnPinning,
        setSorting,
        setFilters,
        setExpandedIds,
        setHiddenColumns,
      }),
    );

    act(() => {
      result.current.importState(mockState);
    });

    expect(setColumnOrder).toHaveBeenCalledWith(mockState.columnOrder);
    expect(setColumnSizing).toHaveBeenCalledWith(mockState.columnSizing);
    expect(setColumnPinning).toHaveBeenCalledWith(mockState.columnPinning);
    expect(setSorting).toHaveBeenCalledWith(mockState.sorting);
    expect(setFilters).toHaveBeenCalledWith(mockState.filters);
    expect(setExpandedIds).toHaveBeenCalledWith(mockState.expandedIds);
    expect(setHiddenColumns).toHaveBeenCalledWith(mockState.hiddenColumns);
  });
});

describe('useViewState — graceful handling', () => {
  it('ignores unknown column ids in imported state', () => {
    const setColumnOrder = vi.fn();
    const { result } = renderHook(() =>
      useViewState({
        getColumnOrder: () => ['name', 'age'],
        getColumnSizing: () => ({}),
        getColumnPinning: () => ({ left: [], right: [] }),
        getSorting: () => [],
        getFilters: () => [],
        getExpandedIds: () => [],
        getHiddenColumns: () => [],
        setColumnOrder,
        validColumnIds: ['name', 'age'],
      }),
    );

    act(() => {
      result.current.importState({
        ...mockState,
        columnOrder: ['name', 'age', 'deleted-col'],
      });
    });

    // Should filter out unknown columns
    expect(setColumnOrder).toHaveBeenCalledWith(['name', 'age']);
  });
});
```

- [ ] **Step 2: Create `src/model/use-view-state.ts`**

```ts
import { useCallback } from 'react';
import type { ViewState } from './view-state-types';
import type { ColumnSort } from './types';
import type { FilterExpression } from '../data/types';

export interface UseViewStateOptions {
  // Getters
  getColumnOrder: () => string[];
  getColumnSizing: () => Record<string, number>;
  getColumnPinning: () => { left: string[]; right: string[] };
  getSorting: () => ColumnSort[];
  getFilters: () => FilterExpression[];
  getExpandedIds: () => string[];
  getHiddenColumns: () => string[];

  // Setters (optional — needed for import)
  setColumnOrder?: (order: string[]) => void;
  setColumnSizing?: (sizing: Record<string, number>) => void;
  setColumnPinning?: (pinning: { left: string[]; right: string[] }) => void;
  setSorting?: (sorting: ColumnSort[]) => void;
  setFilters?: (filters: FilterExpression[]) => void;
  setExpandedIds?: (ids: string[]) => void;
  setHiddenColumns?: (ids: string[]) => void;

  /** Valid column ids for filtering unknown columns on import. */
  validColumnIds?: string[];
}

export interface UseViewStateReturn {
  /** Export the current grid state. */
  exportState: () => ViewState;
  /** Import a saved grid state. */
  importState: (state: ViewState) => void;
}

/**
 * Hook for serializing and restoring grid view state.
 * Enables persistence to localStorage, backend, or any storage.
 */
export function useViewState(options: UseViewStateOptions): UseViewStateReturn {
  const {
    getColumnOrder,
    getColumnSizing,
    getColumnPinning,
    getSorting,
    getFilters,
    getExpandedIds,
    getHiddenColumns,
    setColumnOrder,
    setColumnSizing,
    setColumnPinning,
    setSorting,
    setFilters,
    setExpandedIds,
    setHiddenColumns,
    validColumnIds,
  } = options;

  const exportState = useCallback((): ViewState => {
    return {
      columnOrder: getColumnOrder(),
      columnSizing: getColumnSizing(),
      columnPinning: getColumnPinning(),
      sorting: getSorting(),
      filters: getFilters(),
      expandedIds: getExpandedIds(),
      hiddenColumns: getHiddenColumns(),
    };
  }, [
    getColumnOrder,
    getColumnSizing,
    getColumnPinning,
    getSorting,
    getFilters,
    getExpandedIds,
    getHiddenColumns,
  ]);

  const importState = useCallback(
    (state: ViewState) => {
      const filterIds = (ids: string[]) =>
        validColumnIds ? ids.filter((id) => validColumnIds.includes(id)) : ids;

      setColumnOrder?.(filterIds(state.columnOrder));
      setColumnSizing?.(state.columnSizing);
      setColumnPinning?.(state.columnPinning);
      setSorting?.(state.sorting);
      setFilters?.(state.filters);
      setExpandedIds?.(state.expandedIds);
      setHiddenColumns?.(filterIds(state.hiddenColumns));
    },
    [
      setColumnOrder,
      setColumnSizing,
      setColumnPinning,
      setSorting,
      setFilters,
      setExpandedIds,
      setHiddenColumns,
      validColumnIds,
    ],
  );

  return { exportState, importState };
}
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/model/use-view-state.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/model/use-view-state.ts src/model/use-view-state.test.ts src/model/view-state-types.ts
git commit -m "feat(m4): add useViewState hook for grid state persistence"
```

---

## Task 4: ColumnManagementPanel component

A panel with checkboxes to show/hide columns, drag-to-reorder, search, and reset.

**Files:**
- Create: `src/components/ColumnManagementPanel.tsx`
- Create: `src/components/ColumnManagementPanel.test.tsx`

- [ ] **Step 1: Create `src/components/ColumnManagementPanel.tsx`**

```tsx
import { useState, type FC } from 'react';

export interface ColumnManagementPanelProps {
  columns: { id: string; header: string }[];
  hiddenColumns: string[];
  alwaysVisible?: string[];
  searchable?: boolean;
  onToggleColumn: (columnId: string) => void;
  onMoveColumn: (columnId: string, toIndex: number) => void;
  onReset: () => void;
  onClose: () => void;
}

export const ColumnManagementPanel: FC<ColumnManagementPanelProps> = ({
  columns,
  hiddenColumns,
  alwaysVisible = [],
  searchable = true,
  onToggleColumn,
  onReset,
  onClose,
}) => {
  const [search, setSearch] = useState('');

  const filteredColumns = search
    ? columns.filter((c) =>
        (typeof c.header === 'string' ? c.header : c.id)
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : columns;

  return (
    <div className="strata-column-panel" role="dialog" aria-label="Column management">
      <div className="strata-column-panel-header">
        <h3 className="strata-column-panel-title">Columns</h3>
        <button onClick={onClose} aria-label="Close" className="strata-column-panel-close">
          ×
        </button>
      </div>

      {searchable && (
        <div className="strata-column-panel-search">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search columns..."
            aria-label="Search columns"
            className="strata-column-panel-search-input"
          />
        </div>
      )}

      <ul className="strata-column-panel-list" role="list">
        {filteredColumns.map((col) => {
          const isHidden = hiddenColumns.includes(col.id);
          const isLocked = alwaysVisible.includes(col.id);

          return (
            <li key={col.id} className="strata-column-panel-item">
              <label className="strata-column-panel-label">
                <input
                  type="checkbox"
                  checked={!isHidden}
                  onChange={() => onToggleColumn(col.id)}
                  disabled={isLocked}
                  aria-label={`Toggle ${col.header}`}
                />
                <span>{col.header}</span>
                {isLocked && <span className="strata-column-panel-locked">(locked)</span>}
              </label>
            </li>
          );
        })}
      </ul>

      <div className="strata-column-panel-footer">
        <button onClick={onReset} className="strata-column-panel-reset">
          Reset to default
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Write tests — `src/components/ColumnManagementPanel.test.tsx`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ColumnManagementPanel } from './ColumnManagementPanel';

const columns = [
  { id: 'name', header: 'Name' },
  { id: 'age', header: 'Age' },
  { id: 'city', header: 'City' },
];

describe('ColumnManagementPanel', () => {
  it('renders all columns with checkboxes', () => {
    render(
      <ColumnManagementPanel
        columns={columns}
        hiddenColumns={[]}
        onToggleColumn={vi.fn()}
        onMoveColumn={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('shows hidden columns as unchecked', () => {
    render(
      <ColumnManagementPanel
        columns={columns}
        hiddenColumns={['age']}
        onToggleColumn={vi.fn()}
        onMoveColumn={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const ageCheckbox = screen.getByLabelText('Toggle Age');
    expect(ageCheckbox).not.toBeChecked();
  });

  it('calls onToggleColumn when checkbox clicked', () => {
    const onToggle = vi.fn();
    render(
      <ColumnManagementPanel
        columns={columns}
        hiddenColumns={[]}
        onToggleColumn={onToggle}
        onMoveColumn={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Toggle Age'));
    expect(onToggle).toHaveBeenCalledWith('age');
  });

  it('disables always-visible columns', () => {
    render(
      <ColumnManagementPanel
        columns={columns}
        hiddenColumns={[]}
        alwaysVisible={['name']}
        onToggleColumn={vi.fn()}
        onMoveColumn={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Toggle Name')).toBeDisabled();
  });

  it('filters columns by search', () => {
    render(
      <ColumnManagementPanel
        columns={columns}
        hiddenColumns={[]}
        onToggleColumn={vi.fn()}
        onMoveColumn={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('Search columns'), {
      target: { value: 'ag' },
    });
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  });

  it('calls onReset when reset button clicked', () => {
    const onReset = vi.fn();
    render(
      <ColumnManagementPanel
        columns={columns}
        hiddenColumns={['age']}
        onToggleColumn={vi.fn()}
        onMoveColumn={vi.fn()}
        onReset={onReset}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Reset to default'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/components/ColumnManagementPanel.test.tsx`
Expected: PASS.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/components/ColumnManagementPanel.tsx src/components/ColumnManagementPanel.test.tsx
git commit -m "feat(m4): add ColumnManagementPanel component"
```
