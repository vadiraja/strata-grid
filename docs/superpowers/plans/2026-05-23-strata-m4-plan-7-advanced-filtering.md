# Strata M4 · Plan 7 — Advanced Filtering · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add advanced filtering capabilities: a visual filter builder (AND/OR compound conditions), set/checkbox filters for categorical columns, and a global quick-search input. When the data source supports server-side filtering, expressions are pushed to the backend; otherwise they run client-side.

**Architecture:** A `useFilterBuilder` hook manages the filter expression tree (add/remove/update conditions, toggle AND/OR logic). A `FilterBuilderPanel` component renders the visual builder. A `useQuickSearch` hook provides debounced global search. Set filters are an enhancement to the existing per-column filter popover. All filter types produce `FilterExpression` objects that feed into the server data source or client-side evaluation.

**Tech Stack:** TypeScript, React 18/19, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-23-strata-m4-scale-enterprise-design.md` (§3.7, §5.1).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/filter/use-filter-builder.ts` | create | Filter expression tree management |
| `src/filter/use-filter-builder.test.ts` | create | Filter builder hook tests |
| `src/filter/use-quick-search.ts` | create | Debounced global search hook |
| `src/filter/use-quick-search.test.ts` | create | Quick search tests |
| `src/filter/evaluate-filter.ts` | create | Client-side filter expression evaluator |
| `src/filter/evaluate-filter.test.ts` | create | Evaluator unit tests |
| `src/filter/types.ts` | create | Advanced filter config types |
| `src/filter/index.ts` | create | Barrel export |
| `src/components/FilterBuilderPanel.tsx` | create | Visual AND/OR condition builder |
| `src/components/FilterBuilderPanel.test.tsx` | create | FilterBuilder component tests |
| `src/components/QuickSearchInput.tsx` | create | Global search input |
| `src/components/QuickSearchInput.test.tsx` | create | QuickSearch component tests |
| `src/components/SetFilter.tsx` | create | Checkbox/set filter for categorical columns |

---

## Task 1: Filter evaluation (client-side)

A pure function that evaluates a `FilterExpression` tree against a row. Used when the data source doesn't support server-side filtering.

**Files:**
- Create: `src/filter/evaluate-filter.ts`
- Create: `src/filter/evaluate-filter.test.ts`

- [ ] **Step 1: Write failing tests — `src/filter/evaluate-filter.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { evaluateFilter } from './evaluate-filter';
import type { FilterExpression } from '../data/types';

interface Row { id: string; name: string; age: number; city: string }

const row: Row = { id: '1', name: 'Alice Smith', age: 30, city: 'New York' };
const getValue = (r: Row, colId: string) => (r as Record<string, unknown>)[colId];

describe('evaluateFilter — leaf conditions', () => {
  it('equals', () => {
    const expr: FilterExpression = { columnId: 'name', operator: 'equals', value: 'Alice Smith' };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('notEquals', () => {
    const expr: FilterExpression = { columnId: 'name', operator: 'notEquals', value: 'Bob' };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('contains (case-insensitive)', () => {
    const expr: FilterExpression = { columnId: 'name', operator: 'contains', value: 'alice' };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('startsWith', () => {
    const expr: FilterExpression = { columnId: 'name', operator: 'startsWith', value: 'Alice' };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('endsWith', () => {
    const expr: FilterExpression = { columnId: 'name', operator: 'endsWith', value: 'Smith' };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('greaterThan', () => {
    const expr: FilterExpression = { columnId: 'age', operator: 'greaterThan', value: 25 };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('lessThan', () => {
    const expr: FilterExpression = { columnId: 'age', operator: 'lessThan', value: 35 };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('in', () => {
    const expr: FilterExpression = { columnId: 'city', operator: 'in', value: ['New York', 'LA'] };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('isEmpty', () => {
    const emptyRow = { ...row, city: '' };
    const expr: FilterExpression = { columnId: 'city', operator: 'isEmpty' };
    expect(evaluateFilter(emptyRow, expr, getValue)).toBe(true);
    expect(evaluateFilter(row, expr, getValue)).toBe(false);
  });

  it('between', () => {
    const expr: FilterExpression = { columnId: 'age', operator: 'between', value: [25, 35] };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });
});

describe('evaluateFilter — compound expressions', () => {
  it('AND: all conditions must match', () => {
    const expr: FilterExpression = {
      logic: 'and',
      children: [
        { columnId: 'name', operator: 'contains', value: 'Alice' },
        { columnId: 'age', operator: 'greaterThan', value: 25 },
      ],
    };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('AND: fails if one condition fails', () => {
    const expr: FilterExpression = {
      logic: 'and',
      children: [
        { columnId: 'name', operator: 'contains', value: 'Alice' },
        { columnId: 'age', operator: 'greaterThan', value: 50 },
      ],
    };
    expect(evaluateFilter(row, expr, getValue)).toBe(false);
  });

  it('OR: passes if any condition matches', () => {
    const expr: FilterExpression = {
      logic: 'or',
      children: [
        { columnId: 'name', operator: 'equals', value: 'Bob' },
        { columnId: 'age', operator: 'equals', value: 30 },
      ],
    };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });

  it('nested compound expressions', () => {
    const expr: FilterExpression = {
      logic: 'and',
      children: [
        { columnId: 'city', operator: 'equals', value: 'New York' },
        {
          logic: 'or',
          children: [
            { columnId: 'age', operator: 'lessThan', value: 20 },
            { columnId: 'name', operator: 'startsWith', value: 'Ali' },
          ],
        },
      ],
    };
    expect(evaluateFilter(row, expr, getValue)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/filter/evaluate-filter.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/filter/evaluate-filter.ts`**

```ts
import type { FilterExpression } from '../data/types';

/**
 * Evaluates a FilterExpression tree against a single row.
 * Used for client-side filtering when the data source doesn't support server-side.
 */
export function evaluateFilter<TRow>(
  row: TRow,
  expression: FilterExpression,
  getValue: (row: TRow, columnId: string) => unknown,
): boolean {
  // Compound expression
  if (expression.children && expression.children.length > 0) {
    const logic = expression.logic ?? 'and';
    if (logic === 'and') {
      return expression.children.every((child) => evaluateFilter(row, child, getValue));
    }
    return expression.children.some((child) => evaluateFilter(row, child, getValue));
  }

  // Leaf condition
  if (!expression.columnId || !expression.operator) {
    return true; // No condition = pass
  }

  const cellValue = getValue(row, expression.columnId);
  const filterValue = expression.value;

  return evaluateOperator(cellValue, expression.operator, filterValue);
}

function evaluateOperator(
  cellValue: unknown,
  operator: string,
  filterValue: unknown,
): boolean {
  const strCell = String(cellValue ?? '').toLowerCase();
  const strFilter = String(filterValue ?? '').toLowerCase();

  switch (operator) {
    case 'equals':
      return cellValue === filterValue || strCell === strFilter;
    case 'notEquals':
      return cellValue !== filterValue && strCell !== strFilter;
    case 'contains':
      return strCell.includes(strFilter);
    case 'notContains':
      return !strCell.includes(strFilter);
    case 'startsWith':
      return strCell.startsWith(strFilter);
    case 'endsWith':
      return strCell.endsWith(strFilter);
    case 'greaterThan':
      return Number(cellValue) > Number(filterValue);
    case 'lessThan':
      return Number(cellValue) < Number(filterValue);
    case 'greaterOrEqual':
      return Number(cellValue) >= Number(filterValue);
    case 'lessOrEqual':
      return Number(cellValue) <= Number(filterValue);
    case 'in':
      return Array.isArray(filterValue) && filterValue.includes(cellValue);
    case 'notIn':
      return Array.isArray(filterValue) && !filterValue.includes(cellValue);
    case 'between': {
      if (!Array.isArray(filterValue) || filterValue.length < 2) return false;
      const num = Number(cellValue);
      return num >= Number(filterValue[0]) && num <= Number(filterValue[1]);
    }
    case 'isEmpty':
      return cellValue == null || cellValue === '' || cellValue === undefined;
    case 'isNotEmpty':
      return cellValue != null && cellValue !== '';
    default:
      return true;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/filter/evaluate-filter.test.ts`
Expected: PASS — all tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/filter/evaluate-filter.ts src/filter/evaluate-filter.test.ts
git commit -m "feat(m4): add client-side filter expression evaluator"
```

---

## Task 2: useFilterBuilder hook

Manages the filter expression tree state — add/remove conditions, change operators/values, toggle AND/OR logic.

**Files:**
- Create: `src/filter/use-filter-builder.ts`
- Create: `src/filter/use-filter-builder.test.ts`

- [ ] **Step 1: Write failing tests — `src/filter/use-filter-builder.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilterBuilder } from './use-filter-builder';

describe('useFilterBuilder — initial state', () => {
  it('starts with an empty AND group', () => {
    const { result } = renderHook(() => useFilterBuilder());
    expect(result.current.expression).toEqual({ logic: 'and', children: [] });
  });
});

describe('useFilterBuilder — addCondition', () => {
  it('adds a leaf condition', () => {
    const { result } = renderHook(() => useFilterBuilder());
    act(() => {
      result.current.addCondition({ columnId: 'name', operator: 'contains', value: 'Alice' });
    });
    expect(result.current.expression.children).toHaveLength(1);
    expect(result.current.expression.children![0]).toEqual({
      columnId: 'name',
      operator: 'contains',
      value: 'Alice',
    });
  });
});

describe('useFilterBuilder — removeCondition', () => {
  it('removes a condition by index', () => {
    const { result } = renderHook(() => useFilterBuilder());
    act(() => {
      result.current.addCondition({ columnId: 'name', operator: 'contains', value: 'A' });
      result.current.addCondition({ columnId: 'age', operator: 'greaterThan', value: 20 });
    });
    act(() => {
      result.current.removeCondition(0);
    });
    expect(result.current.expression.children).toHaveLength(1);
    expect(result.current.expression.children![0].columnId).toBe('age');
  });
});

describe('useFilterBuilder — updateCondition', () => {
  it('updates a condition at index', () => {
    const { result } = renderHook(() => useFilterBuilder());
    act(() => {
      result.current.addCondition({ columnId: 'name', operator: 'contains', value: 'A' });
    });
    act(() => {
      result.current.updateCondition(0, { value: 'Bob' });
    });
    expect(result.current.expression.children![0].value).toBe('Bob');
  });
});

describe('useFilterBuilder — toggleLogic', () => {
  it('toggles between AND and OR', () => {
    const { result } = renderHook(() => useFilterBuilder());
    expect(result.current.expression.logic).toBe('and');
    act(() => {
      result.current.toggleLogic();
    });
    expect(result.current.expression.logic).toBe('or');
    act(() => {
      result.current.toggleLogic();
    });
    expect(result.current.expression.logic).toBe('and');
  });
});

describe('useFilterBuilder — clear', () => {
  it('resets to empty', () => {
    const { result } = renderHook(() => useFilterBuilder());
    act(() => {
      result.current.addCondition({ columnId: 'name', operator: 'contains', value: 'A' });
      result.current.addCondition({ columnId: 'age', operator: 'greaterThan', value: 20 });
    });
    act(() => {
      result.current.clear();
    });
    expect(result.current.expression.children).toHaveLength(0);
  });
});

describe('useFilterBuilder — isValid', () => {
  it('returns false when a condition has no column', () => {
    const { result } = renderHook(() => useFilterBuilder());
    act(() => {
      result.current.addCondition({ operator: 'contains', value: 'A' });
    });
    expect(result.current.isValid).toBe(false);
  });

  it('returns true when all conditions are complete', () => {
    const { result } = renderHook(() => useFilterBuilder());
    act(() => {
      result.current.addCondition({ columnId: 'name', operator: 'contains', value: 'A' });
    });
    expect(result.current.isValid).toBe(true);
  });
});
```

- [ ] **Step 2: Create `src/filter/use-filter-builder.ts`**

```ts
import { useState, useCallback } from 'react';
import type { FilterExpression } from '../data/types';

export interface UseFilterBuilderReturn {
  /** The current filter expression tree. */
  expression: FilterExpression;
  /** Add a leaf condition to the root group. */
  addCondition: (condition: Partial<FilterExpression>) => void;
  /** Remove a condition by index. */
  removeCondition: (index: number) => void;
  /** Update a condition at index. */
  updateCondition: (index: number, updates: Partial<FilterExpression>) => void;
  /** Toggle root logic between AND and OR. */
  toggleLogic: () => void;
  /** Clear all conditions. */
  clear: () => void;
  /** Whether all conditions are valid (have column + operator). */
  isValid: boolean;
}

/**
 * Hook managing the filter builder expression tree.
 * Provides CRUD operations on filter conditions and logic toggling.
 */
export function useFilterBuilder(
  initial?: FilterExpression,
): UseFilterBuilderReturn {
  const [expression, setExpression] = useState<FilterExpression>(
    initial ?? { logic: 'and', children: [] },
  );

  const addCondition = useCallback((condition: Partial<FilterExpression>) => {
    setExpression((prev) => ({
      ...prev,
      children: [...(prev.children ?? []), condition as FilterExpression],
    }));
  }, []);

  const removeCondition = useCallback((index: number) => {
    setExpression((prev) => ({
      ...prev,
      children: (prev.children ?? []).filter((_, i) => i !== index),
    }));
  }, []);

  const updateCondition = useCallback(
    (index: number, updates: Partial<FilterExpression>) => {
      setExpression((prev) => ({
        ...prev,
        children: (prev.children ?? []).map((child, i) =>
          i === index ? { ...child, ...updates } : child,
        ),
      }));
    },
    [],
  );

  const toggleLogic = useCallback(() => {
    setExpression((prev) => ({
      ...prev,
      logic: prev.logic === 'and' ? 'or' : 'and',
    }));
  }, []);

  const clear = useCallback(() => {
    setExpression((prev) => ({ ...prev, children: [] }));
  }, []);

  const isValid = (expression.children ?? []).every(
    (child) => child.columnId && child.operator,
  );

  return {
    expression,
    addCondition,
    removeCondition,
    updateCondition,
    toggleLogic,
    clear,
    isValid,
  };
}
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/filter/use-filter-builder.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/filter/use-filter-builder.ts src/filter/use-filter-builder.test.ts
git commit -m "feat(m4): add useFilterBuilder hook for compound filter expressions"
```

---

## Task 3: useQuickSearch hook

Debounced global search across all (or configured) columns.

**Files:**
- Create: `src/filter/use-quick-search.ts`
- Create: `src/filter/use-quick-search.test.ts`

- [ ] **Step 1: Write failing tests — `src/filter/use-quick-search.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuickSearch } from './use-quick-search';

vi.useFakeTimers();

describe('useQuickSearch', () => {
  it('starts with empty search term', () => {
    const { result } = renderHook(() => useQuickSearch({ debounceMs: 300 }));
    expect(result.current.term).toBe('');
    expect(result.current.debouncedTerm).toBe('');
  });

  it('updates term immediately', () => {
    const { result } = renderHook(() => useQuickSearch({ debounceMs: 300 }));
    act(() => { result.current.setTerm('hello'); });
    expect(result.current.term).toBe('hello');
  });

  it('debounces the search term', () => {
    const { result } = renderHook(() => useQuickSearch({ debounceMs: 300 }));
    act(() => { result.current.setTerm('hello'); });
    expect(result.current.debouncedTerm).toBe('');

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.debouncedTerm).toBe('hello');
  });

  it('resets debounce on rapid typing', () => {
    const { result } = renderHook(() => useQuickSearch({ debounceMs: 300 }));
    act(() => { result.current.setTerm('h'); });
    act(() => { vi.advanceTimersByTime(100); });
    act(() => { result.current.setTerm('he'); });
    act(() => { vi.advanceTimersByTime(100); });
    act(() => { result.current.setTerm('hel'); });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.debouncedTerm).toBe('hel');
  });

  it('clear resets both term and debouncedTerm', () => {
    const { result } = renderHook(() => useQuickSearch({ debounceMs: 300 }));
    act(() => { result.current.setTerm('hello'); });
    act(() => { vi.advanceTimersByTime(300); });
    act(() => { result.current.clear(); });
    expect(result.current.term).toBe('');
    expect(result.current.debouncedTerm).toBe('');
  });
});
```

- [ ] **Step 2: Create `src/filter/use-quick-search.ts`**

```ts
import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseQuickSearchOptions {
  /** Debounce delay in milliseconds. Default: 300. */
  debounceMs?: number;
}

export interface UseQuickSearchReturn {
  /** The current input value (updates immediately). */
  term: string;
  /** The debounced search term (updates after delay). */
  debouncedTerm: string;
  /** Update the search term. */
  setTerm: (term: string) => void;
  /** Clear the search. */
  clear: () => void;
}

/**
 * Hook providing debounced global search.
 * `term` updates immediately for responsive input; `debouncedTerm` updates
 * after the debounce delay for triggering actual search/filter operations.
 */
export function useQuickSearch(
  options: UseQuickSearchOptions = {},
): UseQuickSearchReturn {
  const { debounceMs = 300 } = options;

  const [term, setTermState] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTerm = useCallback(
    (newTerm: string) => {
      setTermState(newTerm);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setDebouncedTerm(newTerm);
      }, debounceMs);
    },
    [debounceMs],
  );

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setTermState('');
    setDebouncedTerm('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { term, debouncedTerm, setTerm, clear };
}
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/filter/use-quick-search.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/filter/use-quick-search.ts src/filter/use-quick-search.test.ts
git commit -m "feat(m4): add useQuickSearch hook with debouncing"
```

---

## Task 4: FilterBuilderPanel, QuickSearchInput, and barrel export

**Files:**
- Create: `src/components/FilterBuilderPanel.tsx`
- Create: `src/components/QuickSearchInput.tsx`
- Create: `src/filter/index.ts`

- [ ] **Step 1: Create `src/components/QuickSearchInput.tsx`**

```tsx
import type { FC } from 'react';

export interface QuickSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export const QuickSearchInput: FC<QuickSearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
}) => (
  <div className="strata-quick-search">
    <input
      type="search"
      className="strata-quick-search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label="Quick search"
    />
    {value && (
      <button
        className="strata-quick-search-clear"
        onClick={onClear}
        aria-label="Clear search"
      >
        ×
      </button>
    )}
  </div>
);
```

- [ ] **Step 2: Create `src/components/FilterBuilderPanel.tsx`**

```tsx
import type { FC } from 'react';
import type { FilterExpression } from '../data/types';

export interface FilterBuilderPanelProps {
  expression: FilterExpression;
  columns: { id: string; header: string }[];
  onAddCondition: () => void;
  onRemoveCondition: (index: number) => void;
  onUpdateCondition: (index: number, updates: Partial<FilterExpression>) => void;
  onToggleLogic: () => void;
  onClear: () => void;
  onApply: () => void;
}

export const FilterBuilderPanel: FC<FilterBuilderPanelProps> = ({
  expression,
  columns,
  onAddCondition,
  onRemoveCondition,
  onUpdateCondition,
  onToggleLogic,
  onClear,
  onApply,
}) => {
  const conditions = expression.children ?? [];

  return (
    <div className="strata-filter-builder" role="region" aria-label="Filter builder">
      <div className="strata-filter-builder-header">
        <button
          className="strata-filter-logic-toggle"
          onClick={onToggleLogic}
          aria-label={`Logic: ${expression.logic?.toUpperCase()}`}
        >
          {expression.logic?.toUpperCase() ?? 'AND'}
        </button>
        <span className="strata-filter-builder-title">Filter conditions</span>
      </div>

      <div className="strata-filter-conditions">
        {conditions.map((condition, index) => (
          <div key={index} className="strata-filter-condition-row">
            <select
              value={condition.columnId ?? ''}
              onChange={(e) => onUpdateCondition(index, { columnId: e.target.value })}
              aria-label="Filter column"
              className="strata-filter-col-select"
            >
              <option value="">Select column</option>
              {columns.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.header}
                </option>
              ))}
            </select>

            <select
              value={condition.operator ?? ''}
              onChange={(e) => onUpdateCondition(index, { operator: e.target.value as FilterExpression['operator'] })}
              aria-label="Filter operator"
              className="strata-filter-op-select"
            >
              <option value="">Operator</option>
              <option value="equals">Equals</option>
              <option value="notEquals">Not equals</option>
              <option value="contains">Contains</option>
              <option value="startsWith">Starts with</option>
              <option value="endsWith">Ends with</option>
              <option value="greaterThan">Greater than</option>
              <option value="lessThan">Less than</option>
              <option value="isEmpty">Is empty</option>
              <option value="isNotEmpty">Is not empty</option>
            </select>

            <input
              type="text"
              value={String(condition.value ?? '')}
              onChange={(e) => onUpdateCondition(index, { value: e.target.value })}
              aria-label="Filter value"
              className="strata-filter-value-input"
              placeholder="Value"
            />

            <button
              onClick={() => onRemoveCondition(index)}
              aria-label="Remove condition"
              className="strata-filter-remove-btn"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="strata-filter-builder-actions">
        <button onClick={onAddCondition} className="strata-filter-add-btn">
          + Add condition
        </button>
        <div className="strata-filter-builder-buttons">
          <button onClick={onClear} className="strata-filter-clear-btn">
            Clear
          </button>
          <button onClick={onApply} className="strata-filter-apply-btn">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Create `src/filter/index.ts`**

```ts
export { evaluateFilter } from './evaluate-filter';
export { useFilterBuilder } from './use-filter-builder';
export type { UseFilterBuilderReturn } from './use-filter-builder';
export { useQuickSearch } from './use-quick-search';
export type { UseQuickSearchOptions, UseQuickSearchReturn } from './use-quick-search';
```

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/filter/ src/components/FilterBuilderPanel.tsx src/components/QuickSearchInput.tsx
git commit -m "feat(m4): add FilterBuilderPanel, QuickSearchInput, and filter barrel"
```
