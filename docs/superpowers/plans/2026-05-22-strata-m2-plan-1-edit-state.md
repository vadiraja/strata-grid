# Strata M2 · Plan 1 — Edit State & Cell Activation · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the core editing infrastructure — an `useEditState` hook that tracks which cell is being edited, stores pending values, manages dirty state, and handles cell activation (double-click / Enter). This plan does NOT render editors yet (Plan 2); it establishes the state machine and wiring.

**Architecture:** A `useEditState` hook manages the editing lifecycle: idle → active → committing/discarding → idle. The hook exposes `activeCell`, `startEdit`, `commitEdit`, `discardEdit`, and `getDirtyState`. `DataCell` gains an `onDoubleClick` handler that activates editing. The `editable` prop on `DataGridProps` enables the feature; individual columns opt in via `ColumnDef.editable`.

**Tech Stack:** TypeScript, React 18/19, `@tanstack/react-table` v8, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-22-strata-m2-editing-aggregation-design.md` (§3.1, §3.2, §5.1, §5.2, §6).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/model/types.ts` | modify | Add `EditableConfig`, `EditorContext`, edit event types, `editable` on `ColumnDef` |
| `src/model/use-edit-state.ts` | create | Edit state machine hook |
| `src/model/use-edit-state.test.ts` | create | Unit tests for edit state transitions |
| `src/components/DataGrid.tsx` | modify | Accept `editable` prop, wire edit state |
| `src/components/DataCell.tsx` | modify | Add double-click activation |
| `src/components/DataGrid.editing.test.tsx` | create | Integration tests for cell activation |
| `src/index.ts` | modify | Export new types |

---

## Task 1: Editing types

Add the editing-related types to the type system: `EditableConfig`, `EditorContext`, edit event interfaces, and the `editable` field on `ColumnDef`.

**Files:**
- Modify: `src/model/types.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Add editing types to `src/model/types.ts`**

Append after the `GridTheme` type (before the `declare module` block):

```ts
/**
 * Configures grid-level editing behavior.
 */
export interface EditableConfig {
  /** Edit mode: 'cell' (default) or 'row'. */
  mode?: 'cell' | 'row';
  /** How to activate cell editing. Default: 'doubleClick'. */
  activateOn?: 'doubleClick' | 'singleClick' | 'enter';
  /** Whether to show a visual indicator on editable cells. Default: true. */
  showEditableIndicator?: boolean;
}

/**
 * Context passed to a custom editor component.
 */
export interface EditorContext<TRow> {
  /** The current cell value. */
  value: unknown;
  /** The row data. */
  row: TRow;
  /** The column definition. */
  column: ColumnDef<TRow>;
  /** The row's unique id. */
  rowId: string;
  /** Call to update the pending value. */
  onChange: (newValue: unknown) => void;
  /** Call to commit the edit. */
  onCommit: () => void;
  /** Call to discard the edit. */
  onDiscard: () => void;
  /** Current validation state. */
  validation: ValidationState;
}

/** Validation state for a cell. */
export interface ValidationState {
  status: 'valid' | 'invalid' | 'validating';
  message?: string;
}

/** A validator function for a column. */
export type Validator<TRow> = (
  value: unknown,
  row: TRow,
) => ValidationResult | Promise<ValidationResult>;

/** Validation result: true = valid, string = error message. */
export type ValidationResult = true | string;

/** Event fired when a cell edit starts. */
export interface CellEditEvent<TRow> {
  rowId: string;
  columnId: string;
  row: TRow;
  value: unknown;
}

/** Event fired when a cell edit ends. */
export interface CellEditEndEvent<TRow> extends CellEditEvent<TRow> {
  newValue: unknown;
  committed: boolean;
}

/** Event fired when a row enters edit mode. */
export interface RowEditEvent<TRow> {
  rowId: string;
  row: TRow;
}

/** Event fired when a row exits edit mode. */
export interface RowEditEndEvent<TRow> extends RowEditEvent<TRow> {
  changes: Record<string, { oldValue: unknown; newValue: unknown }>;
  committed: boolean;
}

/** Built-in aggregation types. */
export type AggregateType = 'sum' | 'avg' | 'min' | 'max' | 'count';

/** Built-in editor types. */
export type EditorType = 'text' | 'number' | 'select' | 'date' | 'checkbox';
```

- [ ] **Step 2: Add `editable`, `editorType`, `editor`, `validate`, `aggregate` to `ColumnDef`**

Add the following fields to the `ColumnDef<TRow>` interface:

```ts
  /** Whether this column is editable. Default: false. */
  editable?: boolean | ((row: TRow) => boolean);
  /** Built-in editor type. */
  editorType?: EditorType;
  /** Custom editor component. Takes precedence over editorType. */
  editor?: (ctx: EditorContext<TRow>) => ReactNode;
  /** Editor options (e.g., choices for select editor). */
  editorOptions?: Record<string, unknown>;
  /** Validation rules for this column. */
  validate?: Validator<TRow> | Validator<TRow>[];
  /** Aggregation function for group/parent rows. */
  aggregate?: AggregateType | ((values: unknown[]) => unknown);
```

- [ ] **Step 3: Export new types from `src/index.ts`**

Add to the type exports:

```ts
export type {
  // ... existing ...
  EditableConfig,
  EditorContext,
  EditorType,
  ValidationState,
  Validator,
  ValidationResult,
  CellEditEvent,
  CellEditEndEvent,
  RowEditEvent,
  RowEditEndEvent,
  AggregateType,
} from './model/types';
```

- [ ] **Step 4: Verify types type-check**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 5: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — all existing tests pass unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/model/types.ts src/index.ts
git commit -m "feat(m2): add editing and aggregation types"
```

---

## Task 2: Edit state hook

Create the `useEditState` hook — the core state machine for cell editing. It tracks the active cell, pending values, dirty state, and exposes start/commit/discard operations.

**Files:**
- Create: `src/model/use-edit-state.ts`
- Create: `src/model/use-edit-state.test.ts`

- [ ] **Step 1: Write the failing tests — `src/model/use-edit-state.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditState } from './use-edit-state';
import type { EditStateOptions } from './use-edit-state';

function createOptions(overrides: Partial<EditStateOptions> = {}): EditStateOptions {
  return {
    mode: 'cell',
    onCellEditStart: vi.fn(),
    onCellEditEnd: vi.fn(),
    ...overrides,
  };
}

describe('useEditState — initial state', () => {
  it('starts with no active cell', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    expect(result.current.activeCell).toBeNull();
  });

  it('starts with no dirty cells', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    expect(result.current.isDirty()).toBe(false);
  });
});

describe('useEditState — startEdit', () => {
  it('sets the active cell', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
    });
    expect(result.current.activeCell).toEqual({
      rowId: 'row-1',
      columnId: 'col-name',
      originalValue: 'Alice',
      pendingValue: 'Alice',
    });
  });

  it('fires onCellEditStart', () => {
    const onCellEditStart = vi.fn();
    const { result } = renderHook(() =>
      useEditState(createOptions({ onCellEditStart })),
    );
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
    });
    expect(onCellEditStart).toHaveBeenCalledWith({
      rowId: 'row-1',
      columnId: 'col-name',
      value: 'Alice',
    });
  });

  it('auto-commits previous cell if starting a new edit', () => {
    const onCellEditEnd = vi.fn();
    const { result } = renderHook(() =>
      useEditState(createOptions({ onCellEditEnd })),
    );
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
    });
    act(() => {
      result.current.startEdit('row-2', 'col-name', 'Charlie');
    });
    expect(onCellEditEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        rowId: 'row-1',
        columnId: 'col-name',
        newValue: 'Bob',
        committed: true,
      }),
    );
  });
});

describe('useEditState — setPendingValue', () => {
  it('updates the pending value', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
    });
    expect(result.current.activeCell?.pendingValue).toBe('Bob');
  });
});

describe('useEditState — commitEdit', () => {
  it('clears the active cell', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
      result.current.commitEdit();
    });
    expect(result.current.activeCell).toBeNull();
  });

  it('fires onCellEditEnd with committed: true', () => {
    const onCellEditEnd = vi.fn();
    const { result } = renderHook(() =>
      useEditState(createOptions({ onCellEditEnd })),
    );
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
      result.current.commitEdit();
    });
    expect(onCellEditEnd).toHaveBeenCalledWith({
      rowId: 'row-1',
      columnId: 'col-name',
      value: 'Alice',
      newValue: 'Bob',
      committed: true,
    });
  });

  it('adds to dirty state when value changed', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
      result.current.commitEdit();
    });
    expect(result.current.isDirty()).toBe(true);
    const dirty = result.current.getDirtyState();
    expect(dirty.get('row-1')?.get('col-name')).toBe('Bob');
  });

  it('does not add to dirty state when value unchanged', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.commitEdit();
    });
    expect(result.current.isDirty()).toBe(false);
  });

  it('no-ops when no active cell', () => {
    const onCellEditEnd = vi.fn();
    const { result } = renderHook(() =>
      useEditState(createOptions({ onCellEditEnd })),
    );
    act(() => {
      result.current.commitEdit();
    });
    expect(onCellEditEnd).not.toHaveBeenCalled();
  });
});

describe('useEditState — discardEdit', () => {
  it('clears the active cell', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
      result.current.discardEdit();
    });
    expect(result.current.activeCell).toBeNull();
  });

  it('fires onCellEditEnd with committed: false', () => {
    const onCellEditEnd = vi.fn();
    const { result } = renderHook(() =>
      useEditState(createOptions({ onCellEditEnd })),
    );
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
      result.current.discardEdit();
    });
    expect(onCellEditEnd).toHaveBeenCalledWith({
      rowId: 'row-1',
      columnId: 'col-name',
      value: 'Alice',
      newValue: 'Bob',
      committed: false,
    });
  });

  it('does not add to dirty state', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
      result.current.discardEdit();
    });
    expect(result.current.isDirty()).toBe(false);
  });
});

describe('useEditState — getDirtyState', () => {
  it('accumulates multiple edits', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
      result.current.commitEdit();
    });
    act(() => {
      result.current.startEdit('row-1', 'col-age', 25);
      result.current.setPendingValue(30);
      result.current.commitEdit();
    });
    act(() => {
      result.current.startEdit('row-2', 'col-name', 'Charlie');
      result.current.setPendingValue('Dave');
      result.current.commitEdit();
    });
    const dirty = result.current.getDirtyState();
    expect(dirty.size).toBe(2);
    expect(dirty.get('row-1')?.size).toBe(2);
    expect(dirty.get('row-2')?.get('col-name')).toBe('Dave');
  });

  it('clearDirtyState resets all dirty cells', () => {
    const { result } = renderHook(() => useEditState(createOptions()));
    act(() => {
      result.current.startEdit('row-1', 'col-name', 'Alice');
      result.current.setPendingValue('Bob');
      result.current.commitEdit();
    });
    act(() => {
      result.current.clearDirtyState();
    });
    expect(result.current.isDirty()).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/model/use-edit-state.test.ts`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Create `src/model/use-edit-state.ts`**

```ts
import { useState, useCallback, useRef } from 'react';

export interface ActiveCell {
  rowId: string;
  columnId: string;
  originalValue: unknown;
  pendingValue: unknown;
}

export interface EditStateOptions {
  /** Edit mode: 'cell' or 'row'. */
  mode: 'cell' | 'row';
  /** Called when a cell edit starts. */
  onCellEditStart?: (event: { rowId: string; columnId: string; value: unknown }) => void;
  /** Called when a cell edit ends. */
  onCellEditEnd?: (event: {
    rowId: string;
    columnId: string;
    value: unknown;
    newValue: unknown;
    committed: boolean;
  }) => void;
}

export interface EditStateReturn {
  /** The currently active (editing) cell, or null if idle. */
  activeCell: ActiveCell | null;
  /** Start editing a cell. Auto-commits any previous active cell. */
  startEdit: (rowId: string, columnId: string, currentValue: unknown) => void;
  /** Update the pending value for the active cell. */
  setPendingValue: (value: unknown) => void;
  /** Commit the current edit. */
  commitEdit: () => void;
  /** Discard the current edit. */
  discardEdit: () => void;
  /** Whether any cells have uncommitted changes. */
  isDirty: () => boolean;
  /** Get all dirty cells: rowId → columnId → newValue. */
  getDirtyState: () => Map<string, Map<string, unknown>>;
  /** Clear all dirty state (e.g., after a successful save). */
  clearDirtyState: () => void;
}

/**
 * Hook managing the cell editing state machine.
 *
 * Lifecycle: idle → active (startEdit) → committing/discarding → idle
 *
 * When a new edit starts while another is active, the previous edit is
 * auto-committed (if the value changed) before the new one begins.
 */
export function useEditState(options: EditStateOptions): EditStateReturn {
  const { onCellEditStart, onCellEditEnd } = options;

  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [dirtyState, setDirtyState] = useState<Map<string, Map<string, unknown>>>(
    () => new Map(),
  );

  // Use a ref to access activeCell in callbacks without stale closures
  const activeCellRef = useRef<ActiveCell | null>(null);
  activeCellRef.current = activeCell;

  const commitCurrent = useCallback(() => {
    const cell = activeCellRef.current;
    if (!cell) return;

    onCellEditEnd?.({
      rowId: cell.rowId,
      columnId: cell.columnId,
      value: cell.originalValue,
      newValue: cell.pendingValue,
      committed: true,
    });

    // Add to dirty state only if value actually changed
    if (cell.pendingValue !== cell.originalValue) {
      setDirtyState((prev) => {
        const next = new Map(prev);
        const rowMap = new Map(next.get(cell.rowId) ?? []);
        rowMap.set(cell.columnId, cell.pendingValue);
        next.set(cell.rowId, rowMap);
        return next;
      });
    }

    setActiveCell(null);
  }, [onCellEditEnd]);

  const startEdit = useCallback(
    (rowId: string, columnId: string, currentValue: unknown) => {
      // Auto-commit previous cell if active
      if (activeCellRef.current) {
        commitCurrent();
      }

      onCellEditStart?.({ rowId, columnId, value: currentValue });

      setActiveCell({
        rowId,
        columnId,
        originalValue: currentValue,
        pendingValue: currentValue,
      });
    },
    [commitCurrent, onCellEditStart],
  );

  const setPendingValue = useCallback((value: unknown) => {
    setActiveCell((prev) => (prev ? { ...prev, pendingValue: value } : null));
  }, []);

  const commitEdit = useCallback(() => {
    if (!activeCellRef.current) return;
    commitCurrent();
  }, [commitCurrent]);

  const discardEdit = useCallback(() => {
    const cell = activeCellRef.current;
    if (!cell) return;

    onCellEditEnd?.({
      rowId: cell.rowId,
      columnId: cell.columnId,
      value: cell.originalValue,
      newValue: cell.pendingValue,
      committed: false,
    });

    setActiveCell(null);
  }, [onCellEditEnd]);

  const isDirty = useCallback(() => dirtyState.size > 0, [dirtyState]);

  const getDirtyState = useCallback(() => dirtyState, [dirtyState]);

  const clearDirtyState = useCallback(() => {
    setDirtyState(new Map());
  }, []);

  return {
    activeCell,
    startEdit,
    setPendingValue,
    commitEdit,
    discardEdit,
    isDirty,
    getDirtyState,
    clearDirtyState,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/model/use-edit-state.test.ts`
Expected: PASS — all tests passing.

- [ ] **Step 5: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — all existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/model/use-edit-state.ts src/model/use-edit-state.test.ts
git commit -m "feat(m2): add useEditState hook for cell editing state machine"
```

---

## Task 3: Wire editing into DataGrid and DataCell

Add the `editable` prop to `DataGridProps`, pass edit state down through context, and add double-click activation on `DataCell`.

**Files:**
- Modify: `src/components/DataGrid.tsx`
- Modify: `src/components/DataCell.tsx`
- Create: `src/model/edit-context.ts`

- [ ] **Step 1: Create `src/model/edit-context.ts` — React context for edit state**

```ts
import { createContext, useContext } from 'react';
import type { EditStateReturn } from './use-edit-state';
import type { EditableConfig } from './types';

export interface EditContextValue {
  /** The edit state hook return value. */
  editState: EditStateReturn;
  /** The grid-level editable configuration. */
  config: EditableConfig;
}

export const EditContext = createContext<EditContextValue | null>(null);

/**
 * Returns the edit context. Returns null when editing is not enabled.
 */
export function useEditContext(): EditContextValue | null {
  return useContext(EditContext);
}
```

- [ ] **Step 2: Update `DataGrid.tsx` to accept `editable` prop and provide EditContext**

Add to `DataGridProps`:

```ts
import type { EditableConfig } from '../model/types';
```

Add prop:

```ts
  /** Enables cell editing. Omit to keep the grid read-only. */
  editable?: EditableConfig;
  /** Called when a cell edit starts. */
  onCellEditStart?: (event: { rowId: string; columnId: string; value: unknown }) => void;
  /** Called when a cell edit ends. */
  onCellEditEnd?: (event: {
    rowId: string;
    columnId: string;
    value: unknown;
    newValue: unknown;
    committed: boolean;
  }) => void;
```

Inside the component, conditionally create edit state:

```ts
import { useEditState } from '../model/use-edit-state';
import { EditContext } from '../model/edit-context';

// Inside DataGrid:
const editState = useEditState({
  mode: editable?.mode ?? 'cell',
  onCellEditStart,
  onCellEditEnd,
});

// Wrap GridRoot with EditContext.Provider when editable is provided:
const gridContent = (
  <GridRoot table={table} height={height} treeColumnId={treeColumnId} selection={...} theme={theme} />
);

return editable ? (
  <EditContext.Provider value={{ editState, config: editable }}>
    {gridContent}
  </EditContext.Provider>
) : gridContent;
```

- [ ] **Step 3: Update `DataCell.tsx` to handle double-click activation**

```ts
import { useEditContext } from '../model/edit-context';

// Inside DataCell component:
const editCtx = useEditContext();

const handleDoubleClick = () => {
  if (!editCtx) return;
  const { config, editState } = editCtx;
  if (config.activateOn !== 'doubleClick' && config.activateOn !== undefined) return;

  // Check if this column is editable
  const colDef = cell.column.columnDef.meta?.strataColumn;
  if (!colDef?.editable) return;
  if (typeof colDef.editable === 'function' && !colDef.editable(row.original)) return;

  editState.startEdit(row.id, cell.column.id, cell.getValue());
};

// Add onDoubleClick={handleDoubleClick} to the cell div
```

- [ ] **Step 4: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/model/edit-context.ts src/components/DataGrid.tsx src/components/DataCell.tsx
git commit -m "feat(m2): wire edit state into DataGrid and DataCell activation"
```

---

## Task 4: Cell activation integration tests

End-to-end tests verifying that double-clicking an editable cell activates editing, non-editable cells are ignored, and the edit state transitions work through the full component.

**Files:**
- Create: `src/components/DataGrid.editing.test.tsx`

- [ ] **Step 1: Create `src/components/DataGrid.editing.test.tsx`**

```tsx
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Person {
  id: string;
  name: string;
  age: number;
  role: string;
}

const people: Person[] = [
  { id: '1', name: 'Alice', age: 30, role: 'Engineer' },
  { id: '2', name: 'Bob', age: 25, role: 'Designer' },
  { id: '3', name: 'Charlie', age: 35, role: 'Manager' },
];

const columns: ColumnDef<Person>[] = [
  { id: 'name', header: 'Name', accessor: 'name', editable: true },
  { id: 'age', header: 'Age', accessor: 'age', editable: true, editorType: 'number' },
  { id: 'role', header: 'Role', accessor: 'role', editable: false },
];

describe('DataGrid — cell activation', () => {
  it('fires onCellEditStart on double-click of editable cell', () => {
    const onCellEditStart = vi.fn();
    const { container } = render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'cell' }}
        onCellEditStart={onCellEditStart}
      />,
    );
    const cells = container.querySelectorAll('.strata-cell');
    // First data cell in first row should be "name" column
    fireEvent.doubleClick(cells[0]);
    expect(onCellEditStart).toHaveBeenCalledWith(
      expect.objectContaining({
        columnId: 'name',
        value: 'Alice',
      }),
    );
  });

  it('does not fire onCellEditStart on non-editable cell', () => {
    const onCellEditStart = vi.fn();
    const { container } = render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'cell' }}
        onCellEditStart={onCellEditStart}
      />,
    );
    const cells = container.querySelectorAll('.strata-cell');
    // Third cell in first row is "role" (not editable)
    fireEvent.doubleClick(cells[2]);
    expect(onCellEditStart).not.toHaveBeenCalled();
  });

  it('does not activate editing when editable prop is not provided', () => {
    const onCellEditStart = vi.fn();
    const { container } = render(
      <DataGrid
        data={people}
        columns={columns}
        onCellEditStart={onCellEditStart}
      />,
    );
    const cells = container.querySelectorAll('.strata-cell');
    fireEvent.doubleClick(cells[0]);
    expect(onCellEditStart).not.toHaveBeenCalled();
  });

  it('supports conditional editability via function', () => {
    const conditionalColumns: ColumnDef<Person>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: 'name',
        editable: (row) => row.role === 'Engineer',
      },
      { id: 'age', header: 'Age', accessor: 'age' },
    ];
    const onCellEditStart = vi.fn();
    const { container } = render(
      <DataGrid
        data={people}
        columns={conditionalColumns}
        editable={{ mode: 'cell' }}
        onCellEditStart={onCellEditStart}
      />,
    );
    const rows = container.querySelectorAll('.strata-row');
    // Alice (Engineer) — should be editable
    const aliceCells = rows[0]?.querySelectorAll('.strata-cell');
    if (aliceCells?.[0]) fireEvent.doubleClick(aliceCells[0]);
    expect(onCellEditStart).toHaveBeenCalledTimes(1);

    // Bob (Designer) — should NOT be editable
    onCellEditStart.mockClear();
    const bobCells = rows[1]?.querySelectorAll('.strata-cell');
    if (bobCells?.[0]) fireEvent.doubleClick(bobCells[0]);
    expect(onCellEditStart).not.toHaveBeenCalled();
  });
});

describe('DataGrid — edit commit/discard', () => {
  it('fires onCellEditEnd with committed: true on commit', () => {
    const onCellEditEnd = vi.fn();
    const { container } = render(
      <DataGrid
        data={people}
        columns={columns}
        editable={{ mode: 'cell' }}
        onCellEditEnd={onCellEditEnd}
      />,
    );
    const cells = container.querySelectorAll('.strata-cell');
    // Activate editing
    fireEvent.doubleClick(cells[0]);
    // Activate a different cell (auto-commits the first)
    fireEvent.doubleClick(cells[1]);
    expect(onCellEditEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        columnId: 'name',
        committed: true,
      }),
    );
  });
});
```

- [ ] **Step 2: Run the editing tests**

Run: `npx vitest run src/components/DataGrid.editing.test.tsx`
Expected: PASS — all tests pass.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 4: Commit**

```bash
git add src/components/DataGrid.editing.test.tsx
git commit -m "test(m2): add cell activation integration tests"
```

---

## Task 5: Editable cell visual indicator

Add a CSS class `.strata-cell-editable` to cells that are editable, providing a subtle visual cue (e.g., a pencil icon on hover or a different cursor). Also add `.strata-cell-editing` when a cell is actively being edited.

**Files:**
- Modify: `src/components/DataCell.tsx`
- Modify: `src/strata.css`

- [ ] **Step 1: Add CSS classes to DataCell based on edit state**

In `DataCell.tsx`, compute and apply the appropriate classes:

```ts
const isEditable = editCtx && colDef?.editable &&
  (typeof colDef.editable === 'function' ? colDef.editable(row.original) : colDef.editable);

const isEditing = editCtx?.editState.activeCell?.rowId === row.id &&
  editCtx?.editState.activeCell?.columnId === cell.column.id;

const className = [
  'strata-cell',
  isEditable && 'strata-cell-editable',
  isEditing && 'strata-cell-editing',
].filter(Boolean).join(' ');
```

- [ ] **Step 2: Add CSS rules to `src/strata.css`**

Append to the end of `src/strata.css`:

```css
/* --- Editing --- */

.strata-cell-editable {
  cursor: text;
}

.strata-cell-editable:hover {
  background: var(--strata-bg-row-hover);
}

.strata-cell-editing {
  padding: 0;
  outline: var(--strata-focus-ring-width) solid var(--strata-accent);
  outline-offset: var(--strata-focus-ring-offset);
  z-index: 1;
  position: relative;
}
```

- [ ] **Step 3: Verify it type-checks and builds**

Run: `npx tsc --noEmit && npm run build`
Expected: completes with no errors.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/components/DataCell.tsx src/strata.css
git commit -m "feat(m2): add editable/editing CSS indicators on cells"
```
