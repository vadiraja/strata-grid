# Strata — Design Spec: M2 · Editing & Aggregation

- **Date:** 2026-05-22
- **Status:** Design — awaiting review before implementation planning
- **Scope of this document:** Milestone 2 only. Builds on M1 (read-only tree/BOM grid).

---

## 1. Overview

M2 makes the grid **writable** and adds **computed roll-ups**. After M1 delivers
a fast, accessible, read-only tree grid, M2 adds inline cell editing with
validation, and BOM quantity aggregation — the two features most requested by
PLM/ERP users who need to update material data and see cascading quantities.

The editing layer is designed as a composable extension of the existing
read-only grid. When no `editable` configuration is provided, the grid behaves
identically to M1. When editing is enabled, cells become interactive on
double-click (or Enter), editors appear inline, and changes flow through a
commit model before updating the data.

---

## 2. Goals & non-goals

### Goals (M2)

- Inline cell editing — cell-level and row-level edit modes.
- Built-in editors: text, number, select, date, checkbox.
- Custom editor components (extension point via `ColumnDef.editor`).
- Per-column validation with synchronous and async validators.
- A commit model: pending edits, commit/discard, dirty tracking.
- Edit events: `onCellEditStart`, `onCellEditEnd`, `onRowEditStart`, `onRowEditEnd`.
- **BOM quantity roll-up** — extended quantity (parent qty × component qty)
  cascading down tree levels.
- Column aggregation — sum / avg / min / max / count / custom.
- Aggregates displayed on group rows and optionally on tree parent rows.

### Non-goals (M2)

- Drag-to-reparent, add/delete nodes (M3 — hierarchy editor).
- Undo/redo command history (M3).
- Server-side data sources or lazy loading (M4).
- Clipboard paste-to-edit (M3 — cut/copy/paste subtrees).
- Batch/bulk editing of multiple cells simultaneously.

---

## 3. Architecture

### 3.1 Edit state management

Editing state is managed by a `useEditState` hook that tracks:

- Which cell (or row) is currently in edit mode: `{ rowId, columnId }`.
- The pending (uncommitted) value for the active editor.
- Validation state: `valid | invalid | validating` per cell.
- Dirty cells: a `Map<string, Map<string, unknown>>` of `rowId → columnId → pendingValue`.

The edit state is **local to the grid** by default (uncontrolled). Consumers can
opt into controlled mode by providing `editState` + `onEditStateChange`.

### 3.2 Edit modes

Two modes, configured per-grid:

| Mode | Behavior |
|---|---|
| **Cell** (default) | Double-click or Enter opens a single cell editor. Tab/Enter commits and moves to the next cell. Escape discards. |
| **Row** | Clicking "Edit" on a row opens all editable cells in that row simultaneously. A row-level Save/Cancel commits or discards all changes at once. |

### 3.3 Editor resolution

For each editable cell, the editor component is resolved in order:

1. `ColumnDef.editor` — a custom React component (highest priority).
2. `ColumnDef.editorType` — a string key into the built-in editor registry.
3. Auto-detection from `ColumnDef.type` or value type (fallback).

Built-in editors:

| Key | Component | Value type |
|---|---|---|
| `'text'` | `TextEditor` | `string` |
| `'number'` | `NumberEditor` | `number` |
| `'select'` | `SelectEditor` | `string \| number` (from `editorOptions.choices`) |
| `'date'` | `DateEditor` | `string` (ISO date) |
| `'checkbox'` | `CheckboxEditor` | `boolean` |

### 3.4 Validation

Validators are defined per-column:

```ts
interface ColumnDef<TRow> {
  // ... existing fields ...
  validate?: Validator<TRow> | Validator<TRow>[];
}

type Validator<TRow> = (value: unknown, row: TRow) => ValidationResult | Promise<ValidationResult>;

type ValidationResult = true | string; // true = valid, string = error message
```

Validation runs:
- On every keystroke (debounced 300ms) for immediate feedback.
- On commit attempt — if invalid, the commit is blocked and the error is shown.

Async validators (e.g., server-side uniqueness check) show a "validating…"
state and block commit until resolved.

### 3.5 Commit model

```
User edits cell → pending value stored → validation runs → commit or discard
```

- **Commit** fires `onCellEditEnd({ rowId, columnId, oldValue, newValue })`.
- The consumer decides whether to update `data` (optimistic) or wait for a
  server round-trip. The grid does not mutate `data` directly.
- **Dirty tracking**: `getDirtyState()` returns all uncommitted changes. Useful
  for "Save All" workflows.

### 3.6 BOM quantity roll-up

A tree-specific aggregation: **extended quantity = parent's extended qty × this
row's component quantity**. The root's extended qty equals its own qty.

Configuration:

```ts
<DataGrid
  treeData={...}
  aggregation={{
    extendedQuantity: {
      sourceColumn: 'qty',        // the per-component quantity column
      targetColumn: 'extQty',     // where to display the computed value
      compute: 'multiply-down',   // built-in: parent × child cascading
    },
  }}
/>
```

The roll-up is recomputed whenever:
- A quantity cell is edited and committed.
- The tree structure changes (expand/collapse does NOT affect values, only visibility).
- Data is refreshed.

### 3.7 Column aggregation

For flat grids and group rows, standard aggregations:

```ts
interface ColumnDef<TRow> {
  // ... existing fields ...
  aggregate?: AggregateType | ((values: unknown[]) => unknown);
}

type AggregateType = 'sum' | 'avg' | 'min' | 'max' | 'count';
```

Aggregates are displayed:
- On **group rows** (from Plan 9 row grouping) — the aggregate of all leaf rows in that group.
- On **tree parent rows** (optional) — the aggregate of direct children.
- In the **footer** (optional) — the aggregate of all visible rows.

---

## 4. Component breakdown (additions to M1)

```
<DataGrid>
└─ GridRoot
   ├─ ... (existing M1 components) ...
   ├─ CellEditor              inline editor overlay, positioned over the active cell
   │  ├─ TextEditor           built-in: <input type="text">
   │  ├─ NumberEditor         built-in: <input type="number">
   │  ├─ SelectEditor         built-in: <select> dropdown
   │  ├─ DateEditor           built-in: <input type="date">
   │  └─ CheckboxEditor       built-in: <input type="checkbox">
   ├─ ValidationMessage       error tooltip below the active cell
   ├─ RowEditControls         Save/Cancel buttons for row edit mode
   └─ AggregateCell           renders computed aggregate values in group/parent rows
```

### New hooks

| Hook | Responsibility |
|---|---|
| `useEditState` | Tracks active editor, pending values, dirty state |
| `useCellEditor` | Resolves editor component, manages focus, handles commit/discard |
| `useValidation` | Runs validators, manages validation state, debouncing |
| `useAggregation` | Computes column aggregates and BOM roll-ups |

---

## 5. Public API additions

### 5.1 DataGrid props (new in M2)

```ts
interface DataGridProps<TRow> {
  // ... existing M1 props ...

  /** Enables cell editing. */
  editable?: EditableConfig;
  /** Called when a cell edit starts. */
  onCellEditStart?: (event: CellEditEvent<TRow>) => void;
  /** Called when a cell edit ends (commit or discard). */
  onCellEditEnd?: (event: CellEditEndEvent<TRow>) => void;
  /** Called when a row enters edit mode (row edit mode only). */
  onRowEditStart?: (event: RowEditEvent<TRow>) => void;
  /** Called when a row exits edit mode (row edit mode only). */
  onRowEditEnd?: (event: RowEditEndEvent<TRow>) => void;
  /** Column aggregation and BOM roll-up configuration. */
  aggregation?: AggregationConfig<TRow>;
}

interface EditableConfig {
  /** Edit mode: 'cell' (default) or 'row'. */
  mode?: 'cell' | 'row';
  /** How to activate cell editing. Default: 'doubleClick'. */
  activateOn?: 'doubleClick' | 'singleClick' | 'enter';
  /** Whether to show a visual indicator on editable cells. Default: true. */
  showEditableIndicator?: boolean;
}
```

### 5.2 ColumnDef extensions

```ts
interface ColumnDef<TRow> {
  // ... existing fields ...

  /** Whether this column is editable. Default: false. */
  editable?: boolean | ((row: TRow) => boolean);
  /** Built-in editor type. */
  editorType?: 'text' | 'number' | 'select' | 'date' | 'checkbox';
  /** Custom editor component. Takes precedence over editorType. */
  editor?: (ctx: EditorContext<TRow>) => ReactNode;
  /** Editor options (e.g., choices for select editor). */
  editorOptions?: EditorOptions;
  /** Validation rules for this column. */
  validate?: Validator<TRow> | Validator<TRow>[];
  /** Aggregation function for group/parent rows. */
  aggregate?: AggregateType | ((values: unknown[]) => unknown);
  /** Format function for aggregate display. */
  aggregateFormatter?: (value: unknown) => ReactNode;
}
```

### 5.3 Editor context

```ts
interface EditorContext<TRow> {
  /** The current cell value. */
  value: unknown;
  /** The row data. */
  row: TRow;
  /** The column definition. */
  column: ColumnDef<TRow>;
  /** Call to update the pending value. */
  onChange: (newValue: unknown) => void;
  /** Call to commit the edit. */
  onCommit: () => void;
  /** Call to discard the edit. */
  onDiscard: () => void;
  /** Current validation state. */
  validation: { status: 'valid' | 'invalid' | 'validating'; message?: string };
}
```

### 5.4 Event types

```ts
interface CellEditEvent<TRow> {
  rowId: string;
  columnId: string;
  row: TRow;
  value: unknown;
}

interface CellEditEndEvent<TRow> extends CellEditEvent<TRow> {
  newValue: unknown;
  committed: boolean; // true if committed, false if discarded
}

interface RowEditEvent<TRow> {
  rowId: string;
  row: TRow;
}

interface RowEditEndEvent<TRow> extends RowEditEvent<TRow> {
  changes: Record<string, { oldValue: unknown; newValue: unknown }>;
  committed: boolean;
}
```

### 5.5 Aggregation config

```ts
interface AggregationConfig<TRow> {
  /** BOM extended quantity roll-up. Tree mode only. */
  extendedQuantity?: {
    sourceColumn: string;
    targetColumn: string;
    compute: 'multiply-down' | ((parentQty: number, childQty: number) => number);
  };
  /** Show column aggregates in the footer. */
  showFooterAggregates?: boolean;
  /** Show aggregates on tree parent rows. */
  showParentAggregates?: boolean;
}
```

### 5.6 GridApi additions

```ts
interface GridApi<TRow> {
  // ... existing M1 methods ...

  /** Start editing a specific cell. */
  startCellEdit(rowId: string, columnId: string): void;
  /** Commit the current edit. */
  commitEdit(): void;
  /** Discard the current edit. */
  discardEdit(): void;
  /** Start editing a row (row edit mode). */
  startRowEdit(rowId: string): void;
  /** Commit all pending row edits. */
  commitRowEdit(): void;
  /** Discard all pending row edits. */
  discardRowEdit(): void;
  /** Get all dirty (uncommitted) cell values. */
  getDirtyState(): Map<string, Map<string, unknown>>;
  /** Check if any cells have uncommitted changes. */
  isDirty(): boolean;
}
```

---

## 6. Data flow (editing)

```
1. User activates cell (dblclick / Enter / API)
2. useEditState sets activeCell = { rowId, columnId }
3. CellEditor renders inline, positioned over the cell
4. User types → onChange → pending value updated → validation runs (debounced)
5a. Commit (Enter/Tab/blur):
    - If valid: fire onCellEditEnd({ committed: true, newValue })
    - Consumer updates data → grid re-renders with new value
5b. Discard (Escape):
    - Fire onCellEditEnd({ committed: false })
    - Restore original value display
```

### Tab navigation in cell edit mode

- **Tab** commits current cell and moves editor to the next editable cell in the row.
- **Shift+Tab** commits and moves to the previous editable cell.
- **Enter** commits and moves down to the same column in the next row.
- **Escape** discards without moving.

---

## 7. Data flow (aggregation)

```
1. Data changes (edit commit, data refresh, tree expand)
2. useAggregation recomputes:
   a. Column aggregates for each group row (sum/avg/min/max/count)
   b. BOM extended quantity cascade (root → leaves, multiply-down)
3. AggregateCell renders computed values in group/parent rows
4. Footer aggregates update
```

### BOM roll-up algorithm

```
function computeExtendedQty(node, parentExtQty = 1):
  node.extQty = parentExtQty * node.qty
  for each child of node:
    computeExtendedQty(child, node.extQty)
```

This is O(n) — one pass over the tree. Recomputed only when qty values change
or tree structure changes.

---

## 8. Error handling & edge cases

| Edge case | Handling |
|---|---|
| Edit a cell in a row that disappears (filter/sort change) | Auto-discard the edit; fire `onCellEditEnd({ committed: false })` |
| Async validator takes too long | Show "validating…" state; timeout after 10s → treat as invalid |
| Custom editor throws | Editor-level error boundary → fallback to text editor |
| Aggregate on non-numeric column | Skip gracefully; dev-warn |
| BOM roll-up with circular tree | Already handled by M1 cycle detection; roll-up skips cycles |
| Edit a cell while another is being edited | Auto-commit the previous cell (if valid) or discard (if invalid) |
| Read-only column receives edit attempt | No-op; cell is not activatable |
| Null/undefined values in aggregation | Excluded from computation; count still counts them |

---

## 9. Testing strategy

| Layer | Tools | Coverage |
|---|---|---|
| Unit | Vitest | Validation logic, aggregation math, BOM roll-up, edit state transitions |
| Component | Vitest + RTL | Editor rendering, commit/discard flow, Tab navigation, validation display |
| Integration | Vitest + RTL | Full DataGrid with editing + sorting + filtering + tree interactions |
| Accessibility | RTL + axe | Editor focus management, ARIA attributes on editable cells |
| E2E | Playwright | Real-browser editing flow, Tab navigation, validation UX |

---

## 10. Success criteria for M2

M2 is complete when:

1. Double-clicking (or pressing Enter on) an editable cell opens an inline
   editor; Tab/Enter commits; Escape discards.
2. All five built-in editors (text, number, select, date, checkbox) work
   correctly with proper focus management.
3. Custom editor components render and receive correct context.
4. Per-column validators run on edit, display errors inline, and block invalid
   commits.
5. Row edit mode opens all editable cells in a row with Save/Cancel controls.
6. BOM extended quantity roll-up computes correctly and updates when quantities
   change.
7. Column aggregates (sum/avg/min/max/count) display on group rows and
   optionally in the footer.
8. All editing interactions are keyboard-accessible.
9. The grid remains performant (no jank) during editing of large datasets.
10. All new features have unit tests, component tests, and integration tests.

---

## 11. Implementation plan structure

M2 is broken into implementation plans following the same pattern as M1:

| Plan | Title | Scope |
|---|---|---|
| **Plan 1** | Edit state & cell activation | `useEditState`, cell activation logic, edit mode switching |
| **Plan 2** | Built-in editors | TextEditor, NumberEditor, SelectEditor, DateEditor, CheckboxEditor |
| **Plan 3** | Validation | `useValidation`, sync/async validators, error display |
| **Plan 4** | Row edit mode | Row-level editing, Save/Cancel controls, batch commit |
| **Plan 5** | Tab navigation & focus | Tab/Shift+Tab/Enter navigation between editable cells |
| **Plan 6** | Column aggregation | sum/avg/min/max/count, group row aggregates, footer |
| **Plan 7** | BOM quantity roll-up | Extended quantity cascade, `useAggregation` hook |
| **Plan 8** | Custom editors & API | Custom editor extension point, `GridApi` editing methods |

Each plan is a self-contained, test-first implementation with task-by-task
steps and checkbox tracking.
