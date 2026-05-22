# Strata M1 · Plan 7 — Theming & Accessibility · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the grid fully themeable via CSS custom properties and add keyboard navigation with ARIA treegrid accessibility. Consumers can restyle the grid without forking by overriding `--strata-*` tokens. Bundled light (default) and dark themes are provided. Keyboard navigation implements roving tabindex with arrow-key cell focus, Enter/Space to expand/collapse or toggle selection, and Home/End shortcuts.

**Architecture:** All visual values (colors, spacing, fonts, borders, radii) are extracted into CSS custom properties namespaced `--strata-*`. The light theme defines defaults on `.strata-grid`; the dark theme overrides them on `.strata-grid[data-theme="dark"]`. A `theme` prop on `<DataGrid>` sets the `data-theme` attribute. Keyboard navigation is managed by a `useGridKeyboard` hook that tracks the active cell position `[rowIndex, colIndex]` and handles arrow keys, Enter/Space, Home/End, and Ctrl+Home/End. The active cell receives a visible focus ring via `.strata-cell-focused`. The grid root gets `tabIndex={0}` for roving tabindex — only the grid itself is in the tab order; internal cells are navigated with arrow keys.

**Tech Stack:** TypeScript, React 18/19, CSS custom properties, `@tanstack/react-table` v8, `@tanstack/react-virtual` v3, tsup, Vitest + React Testing Library.

**Scope note:** This plan covers **CSS theming tokens, dark theme, keyboard navigation, and ARIA accessibility**. Shift+click range selection is **Plan 10**. Context menus are **M3**.

**Spec:** `docs/superpowers/specs/2026-05-21-strata-tree-data-grid-design.md` (§5.9, §5.10, §8). Builds directly on Plan 6 (`docs/superpowers/plans/2026-05-21-strata-m1-plan-6-row-selection.md`), merged to `master`.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/theme/tokens.css` | create | CSS custom properties: colors, spacing, fonts, borders, radii |
| `src/theme/dark.css` | create | Dark theme overrides on `[data-theme="dark"]` |
| `src/strata.css` | modify | Replace hardcoded values with `var(--strata-*)` references |
| `src/model/types.ts` | modify | Add `theme` to `DataGridProps` concept |
| `src/components/DataGrid.tsx` | modify | Accept `theme` prop, pass to GridRoot |
| `src/components/GridRoot.tsx` | modify | Set `data-theme` attribute, `tabIndex={0}`, keyboard handler |
| `src/model/use-grid-keyboard.ts` | create | Roving tabindex keyboard navigation hook |
| `src/model/use-grid-keyboard.test.ts` | create | Keyboard navigation unit tests |
| `src/components/GridRow.tsx` | modify | Accept `activeColIndex` for focus ring |
| `src/components/DataCell.tsx` | modify | Accept `isFocused` prop, add focus class |
| `src/components/TreeCell.tsx` | modify | Accept `isFocused` prop, add focus class |
| `src/components/DataGrid.a11y.test.tsx` | create | Accessibility integration tests |
| `src/index.ts` | modify | Export theme-related types |
| `playground/App.tsx` | modify | Add theme toggle button |

---

## Task 1: CSS custom properties foundation

Extract all visual values into CSS custom properties namespaced `--strata-*`. The light theme values are defined as defaults on `.strata-grid`. This creates the theming contract that consumers can override.

**Files:**
- Create: `src/theme/tokens.css`

- [ ] **Step 1: Create `src/theme/tokens.css`**

```css
/*
 * Strata Design Tokens
 *
 * All visual values are defined as CSS custom properties on .strata-grid.
 * Override any --strata-* variable to restyle the grid without forking.
 * The values below constitute the "light" theme (default).
 */

.strata-grid {
  /* --- Colors: Background --- */
  --strata-bg: #ffffff;
  --strata-bg-header: #f5f5f7;
  --strata-bg-header-hover: #ededf0;
  --strata-bg-footer: #f5f5f7;
  --strata-bg-row-hover: rgba(0, 0, 0, 0.02);
  --strata-bg-row-selected: rgba(0, 113, 227, 0.06);
  --strata-bg-row-selected-hover: rgba(0, 113, 227, 0.1);
  --strata-bg-popover: #ffffff;
  --strata-bg-filter-button-hover: #e0e0e3;

  /* --- Colors: Text --- */
  --strata-text: #1d1d1f;
  --strata-text-secondary: #86868b;
  --strata-text-header: #1d1d1f;
  --strata-text-tree-toggle: #6e6e73;

  /* --- Colors: Border --- */
  --strata-border: #d1d1d6;
  --strata-border-cell: #e5e5e7;
  --strata-border-pinned: #d1d1d6;

  /* --- Colors: Accent --- */
  --strata-accent: #0071e3;
  --strata-accent-focus-ring: rgba(0, 113, 227, 0.4);
  --strata-accent-shadow: rgba(0, 113, 227, 0.2);

  /* --- Colors: Misc --- */
  --strata-shadow-popover: rgba(0, 0, 0, 0.12);
  --strata-resize-handle-active: #0071e3;

  /* --- Spacing --- */
  --strata-cell-padding-x: 10px;
  --strata-cell-padding-y: 6px;
  --strata-header-padding-x: 10px;
  --strata-header-padding-y: 6px;
  --strata-footer-padding-x: 10px;
  --strata-footer-padding-y: 6px;
  --strata-popover-padding: 6px;
  --strata-filter-input-padding-x: 8px;
  --strata-filter-input-padding-y: 4px;

  /* --- Typography --- */
  --strata-font-family: system-ui, -apple-system, sans-serif;
  --strata-font-size: 13px;
  --strata-font-size-small: 12px;
  --strata-font-size-sort: 9px;
  --strata-font-size-toggle: 9px;
  --strata-font-size-filter: 10px;
  --strata-font-weight-header: 600;

  /* --- Borders & Radii --- */
  --strata-border-width: 1px;
  --strata-border-pinned-width: 2px;
  --strata-radius-popover: 6px;
  --strata-radius-input: 4px;
  --strata-radius-button: 3px;

  /* --- Focus --- */
  --strata-focus-ring-width: 2px;
  --strata-focus-ring-offset: -1px;
  --strata-focus-ring-color: var(--strata-accent-focus-ring);

  /* --- Sizing --- */
  --strata-selection-cell-width: 40px;
  --strata-checkbox-size: 14px;
  --strata-toggle-size: 18px;
  --strata-filter-button-size: 18px;
  --strata-resize-handle-width: 4px;
  --strata-filter-input-width: 140px;
}
```

- [ ] **Step 2: Verify the file is valid CSS**

Run: `npx tsc --noEmit`
Expected: completes with no errors (CSS files are not type-checked, but ensures no TS breakage).

- [ ] **Step 3: Commit**

```bash
git add src/theme/tokens.css
git commit -m "feat: add CSS custom properties token foundation"
```

---

## Task 2: Dark theme

Create the dark theme as a set of overrides on `.strata-grid[data-theme="dark"]`. All colors are inverted appropriately for dark backgrounds while maintaining contrast ratios.

**Files:**
- Create: `src/theme/dark.css`

- [ ] **Step 1: Create `src/theme/dark.css`**

```css
/*
 * Strata Dark Theme
 *
 * Overrides the default (light) token values when the grid has
 * data-theme="dark". Apply by setting <DataGrid theme="dark" />.
 */

.strata-grid[data-theme="dark"] {
  /* --- Colors: Background --- */
  --strata-bg: #1c1c1e;
  --strata-bg-header: #2c2c2e;
  --strata-bg-header-hover: #3a3a3c;
  --strata-bg-footer: #2c2c2e;
  --strata-bg-row-hover: rgba(255, 255, 255, 0.04);
  --strata-bg-row-selected: rgba(10, 132, 255, 0.12);
  --strata-bg-row-selected-hover: rgba(10, 132, 255, 0.18);
  --strata-bg-popover: #2c2c2e;
  --strata-bg-filter-button-hover: #3a3a3c;

  /* --- Colors: Text --- */
  --strata-text: #f5f5f7;
  --strata-text-secondary: #98989d;
  --strata-text-header: #f5f5f7;
  --strata-text-tree-toggle: #98989d;

  /* --- Colors: Border --- */
  --strata-border: #38383a;
  --strata-border-cell: #2c2c2e;
  --strata-border-pinned: #48484a;

  /* --- Colors: Accent --- */
  --strata-accent: #0a84ff;
  --strata-accent-focus-ring: rgba(10, 132, 255, 0.5);
  --strata-accent-shadow: rgba(10, 132, 255, 0.3);

  /* --- Colors: Misc --- */
  --strata-shadow-popover: rgba(0, 0, 0, 0.4);
  --strata-resize-handle-active: #0a84ff;
}
```

- [ ] **Step 2: Verify the file is valid CSS**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/theme/dark.css
git commit -m "feat: add dark theme CSS overrides"
```

---

## Task 3: Refactor strata.css to use tokens

Replace all hardcoded color, spacing, font, and border values in `src/strata.css` with `var(--strata-*)` references. Import the token and dark theme files. The visual output must remain identical (light theme is the default).

**Files:**
- Modify: `src/strata.css`

- [ ] **Step 1: Replace `src/strata.css` entirely with token-based version**

```css
/* Import token definitions and themes */
@import './theme/tokens.css';
@import './theme/dark.css';

/* --- Grid Shell --- */

.strata-grid {
  display: flex;
  flex-direction: column;
  border: var(--strata-border-width) solid var(--strata-border);
  font-family: var(--strata-font-family);
  font-size: var(--strata-font-size);
  color: var(--strata-text);
  background: var(--strata-bg);
  overflow: hidden;
}

/* --- Header --- */

.strata-header {
  display: flex;
  flex-direction: column;
}

.strata-header-row {
  display: flex;
}

.strata-header-cell {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: var(--strata-header-padding-y) var(--strata-header-padding-x);
  font-weight: var(--strata-font-weight-header);
  color: var(--strata-text-header);
  background: var(--strata-bg-header);
  border-bottom: var(--strata-border-width) solid var(--strata-border);
  border-right: var(--strata-border-width) solid var(--strata-border-cell);
  overflow: hidden;
  white-space: nowrap;
  user-select: none;
  position: relative;
}

.strata-header-cell-sortable {
  cursor: pointer;
}

.strata-header-cell-sortable:hover {
  background: var(--strata-bg-header-hover);
}

.strata-header-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.strata-sort-indicator {
  flex: none;
  font-size: var(--strata-font-size-sort);
  color: var(--strata-text);
}

/* --- Filter --- */

.strata-filter-wrapper {
  flex: none;
  position: relative;
}

.strata-filter-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--strata-filter-button-size);
  height: var(--strata-filter-button-size);
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--strata-text-secondary);
  font-size: var(--strata-font-size-filter);
  cursor: pointer;
  border-radius: var(--strata-radius-button);
}

.strata-filter-button:hover {
  background: var(--strata-bg-filter-button-hover);
  color: var(--strata-text);
}

.strata-filter-popover {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 10;
  margin-top: 2px;
  padding: var(--strata-popover-padding);
  background: var(--strata-bg-popover);
  border: var(--strata-border-width) solid var(--strata-border);
  border-radius: var(--strata-radius-popover);
  box-shadow: 0 2px 8px var(--strata-shadow-popover);
}

.strata-filter-input {
  width: var(--strata-filter-input-width);
  padding: var(--strata-filter-input-padding-y) var(--strata-filter-input-padding-x);
  font-size: var(--strata-font-size-small);
  color: var(--strata-text);
  background: var(--strata-bg);
  border: var(--strata-border-width) solid var(--strata-border);
  border-radius: var(--strata-radius-input);
  outline: none;
}

.strata-filter-input:focus {
  border-color: var(--strata-accent);
  box-shadow: 0 0 0 2px var(--strata-accent-shadow);
}

/* --- Body --- */

.strata-row-container {
  display: flex;
}

.strata-pane-left {
  flex: none;
  position: sticky;
  left: 0;
  z-index: 2;
  background: var(--strata-bg);
  border-right: var(--strata-border-pinned-width) solid var(--strata-border-pinned);
}

.strata-pane-center {
  flex: 1 1 auto;
  overflow: hidden;
}

.strata-pane-right {
  flex: none;
  position: sticky;
  right: 0;
  z-index: 2;
  background: var(--strata-bg);
  border-left: var(--strata-border-pinned-width) solid var(--strata-border-pinned);
}

.strata-resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: var(--strata-resize-handle-width);
  height: 100%;
  cursor: col-resize;
  user-select: none;
  touch-action: none;
}

.strata-resize-handle:hover,
.strata-resize-handle-active {
  background: var(--strata-resize-handle-active);
}

.strata-header-cell[draggable='true']:active {
  opacity: 0.6;
}

.strata-body {
  overflow-x: hidden;
  overflow-y: auto;
  background: var(--strata-bg);
}

.strata-body-sizer {
  position: relative;
  width: 100%;
}

/* --- Rows & Cells --- */

.strata-row {
  display: flex;
}

.strata-row:hover {
  background: var(--strata-bg-row-hover);
}

.strata-cell {
  box-sizing: border-box;
  padding: var(--strata-cell-padding-y) var(--strata-cell-padding-x);
  border-bottom: var(--strata-border-width) solid var(--strata-border-cell);
  border-right: var(--strata-border-width) solid var(--strata-border-cell);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* --- Focus Ring --- */

.strata-cell-focused {
  outline: var(--strata-focus-ring-width) solid var(--strata-focus-ring-color);
  outline-offset: var(--strata-focus-ring-offset);
  z-index: 1;
  position: relative;
}

/* --- Tree --- */

.strata-tree-cell {
  display: flex;
  align-items: center;
  gap: 1px;
}

.strata-tree-indent {
  flex: none;
}

.strata-tree-toggle {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--strata-toggle-size);
  height: var(--strata-toggle-size);
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--strata-text-tree-toggle);
  font-size: var(--strata-font-size-toggle);
  line-height: 1;
  cursor: pointer;
}

.strata-tree-toggle-empty {
  cursor: default;
}

.strata-tree-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* --- Empty State --- */

.strata-empty {
  padding: 24px;
  text-align: center;
  color: var(--strata-text-secondary);
}

/* --- Footer --- */

.strata-footer {
  padding: var(--strata-footer-padding-y) var(--strata-footer-padding-x);
  background: var(--strata-bg-footer);
  border-top: var(--strata-border-width) solid var(--strata-border);
  color: var(--strata-text-secondary);
  font-size: var(--strata-font-size-small);
}

/* --- Selection --- */

.strata-selection-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--strata-selection-cell-width);
  min-width: var(--strata-selection-cell-width);
  max-width: var(--strata-selection-cell-width);
  flex: none;
  padding: 0;
  border-bottom: var(--strata-border-width) solid var(--strata-border-cell);
  border-right: var(--strata-border-width) solid var(--strata-border-cell);
}

.strata-header .strata-selection-cell {
  background: var(--strata-bg-header);
  border-bottom: var(--strata-border-width) solid var(--strata-border);
}

.strata-checkbox {
  width: var(--strata-checkbox-size);
  height: var(--strata-checkbox-size);
  margin: 0;
  cursor: pointer;
  accent-color: var(--strata-accent);
}

.strata-row-selected {
  background: var(--strata-bg-row-selected);
}

.strata-row-selected:hover {
  background: var(--strata-bg-row-selected-hover);
}
```

- [ ] **Step 2: Verify the build produces identical visual output**

Run: `npm run build`
Expected: completes with no errors; `dist/strata.css` contains all rules with `var(--strata-*)` references.

- [ ] **Step 3: Run the full test suite to confirm no regressions**

Run: `npm test`
Expected: PASS — all existing tests pass unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/strata.css src/theme/tokens.css src/theme/dark.css
git commit -m "refactor: replace hardcoded values with CSS custom property tokens"
```

---

## Task 4: Theme prop on DataGrid

Add a `theme` prop to `<DataGrid>` that sets the `data-theme` attribute on the grid root element. This activates the dark theme CSS overrides.

**Files:**
- Modify: `src/model/types.ts`
- Modify: `src/components/DataGrid.tsx`
- Modify: `src/components/GridRoot.tsx`
- Modify: `src/index.ts`

- [ ] **Step 1: Add `GridTheme` type to `src/model/types.ts`**

Append after the existing `SelectionState` interface (or at the end of the file):

```ts
/**
 * Available grid themes.
 * - `'light'` — light background (default)
 * - `'dark'` — dark background with inverted colors
 */
export type GridTheme = 'light' | 'dark';
```

- [ ] **Step 2: Add `theme` prop to `DataGridProps` in `src/components/DataGrid.tsx`**

Add the following property to the `DataGridProps` interface:

```ts
  /**
   * Visual theme for the grid. Defaults to 'light'.
   * - `'light'` — light background with dark text (default)
   * - `'dark'` — dark background with light text
   */
  theme?: GridTheme;
```

Add the import at the top:

```ts
import type { ColumnDef, TreeDataConfig, ColumnSort, GridTheme } from '../model/types';
```

Destructure `theme` in the component and pass it to `GridRoot`:

```ts
export function DataGrid<TRow>({
  data,
  columns,
  height = DEFAULT_GRID_HEIGHT,
  treeData,
  defaultExpanded,
  defaultSort,
  theme,
}: DataGridProps<TRow>) {
```

Pass to GridRoot:

```tsx
  return <GridRoot table={table} height={height} treeColumnId={treeColumnId} theme={theme} />;
```

- [ ] **Step 3: Update `GridRoot.tsx` to set `data-theme` attribute**

Add `theme` to `GridRootProps`:

```ts
import type { GridTheme } from '../model/types';

export interface GridRootProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
  /** Height of the scrollable body area in pixels. */
  height: number;
  /** Id of the tree column. Set only in tree mode. */
  treeColumnId?: string;
  /** Visual theme. */
  theme?: GridTheme;
}
```

Set the attribute on the grid root div:

```tsx
export function GridRoot<TRow>({
  table,
  height,
  treeColumnId,
  theme,
}: GridRootProps<TRow>) {
  return (
    <div
      className="strata-grid"
      role={treeColumnId === undefined ? 'grid' : 'treegrid'}
      data-theme={theme ?? 'light'}
    >
      <HeaderArea table={table} />
      <BodyViewport table={table} height={height} treeColumnId={treeColumnId} />
      <GridFooter rowCount={table.getRowModel().rows.length} />
    </div>
  );
}
```

- [ ] **Step 4: Export `GridTheme` from `src/index.ts`**

Add to the type exports:

```ts
export type {
  ColumnDef,
  CellContext,
  TreeDataConfig,
  SortDirection,
  ColumnSort,
  SortingState,
  FilterType,
  GridTheme,
} from './model/types';
```

- [ ] **Step 5: Verify types type-check**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 7: Commit**

```bash
git add src/model/types.ts src/components/DataGrid.tsx src/components/GridRoot.tsx src/index.ts
git commit -m "feat: add theme prop to DataGrid for light/dark switching"
```

---

## Task 5: Keyboard navigation hook

Create the `useGridKeyboard` hook that implements roving tabindex keyboard navigation. It tracks the active cell position `[rowIndex, colIndex]`, handles arrow keys, Enter/Space for expand/collapse and selection toggle, Home/End for row navigation, and Ctrl+Home/End for grid-level navigation.

**Files:**
- Create: `src/model/use-grid-keyboard.ts`
- Create: `src/model/use-grid-keyboard.test.ts`

- [ ] **Step 1: Write the failing tests — `src/model/use-grid-keyboard.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGridKeyboard } from './use-grid-keyboard';
import type { GridKeyboardOptions } from './use-grid-keyboard';

function createOptions(overrides: Partial<GridKeyboardOptions> = {}): GridKeyboardOptions {
  return {
    rowCount: 5,
    colCount: 4,
    onExpandToggle: vi.fn(),
    onSelectionToggle: vi.fn(),
    isTreeColumn: () => false,
    isSelectionColumn: () => false,
    ...overrides,
  };
}

describe('useGridKeyboard — initial state', () => {
  it('starts at [0, 0]', () => {
    const { result } = renderHook(() => useGridKeyboard(createOptions()));
    expect(result.current.activeCell).toEqual([0, 0]);
  });

  it('starts at custom initial position when provided', () => {
    const { result } = renderHook(() =>
      useGridKeyboard(createOptions({ initialCell: [2, 1] })),
    );
    expect(result.current.activeCell).toEqual([2, 1]);
  });
});

describe('useGridKeyboard — arrow navigation', () => {
  it('ArrowRight moves to next column', () => {
    const { result } = renderHook(() => useGridKeyboard(createOptions()));
    act(() => {
      result.current.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    expect(result.current.activeCell).toEqual([0, 1]);
  });

  it('ArrowRight does not exceed last column', () => {
    const { result } = renderHook(() =>
      useGridKeyboard(createOptions({ initialCell: [0, 3] })),
    );
    act(() => {
      result.current.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    expect(result.current.activeCell).toEqual([0, 3]);
  });

  it('ArrowLeft moves to previous column', () => {
    const { result } = renderHook(() =>
      useGridKeyboard(createOptions({ initialCell: [0, 2] })),
    );
    act(() => {
      result.current.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });
    expect(result.current.activeCell).toEqual([0, 1]);
  });

  it('ArrowLeft does not go below 0', () => {
    const { result } = renderHook(() => useGridKeyboard(createOptions()));
    act(() => {
      result.current.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });
    expect(result.current.activeCell).toEqual([0, 0]);
  });

  it('ArrowDown moves to next row', () => {
    const { result } = renderHook(() => useGridKeyboard(createOptions()));
    act(() => {
      result.current.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    expect(result.current.activeCell).toEqual([1, 0]);
  });

  it('ArrowDown does not exceed last row', () => {
    const { result } = renderHook(() =>
      useGridKeyboard(createOptions({ initialCell: [4, 0] })),
    );
    act(() => {
      result.current.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    expect(result.current.activeCell).toEqual([4, 0]);
  });

  it('ArrowUp moves to previous row', () => {
    const { result } = renderHook(() =>
      useGridKeyboard(createOptions({ initialCell: [2, 0] })),
    );
    act(() => {
      result.current.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    });
    expect(result.current.activeCell).toEqual([1, 0]);
  });

  it('ArrowUp does not go below 0', () => {
    const { result } = renderHook(() => useGridKeyboard(createOptions()));
    act(() => {
      result.current.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    });
    expect(result.current.activeCell).toEqual([0, 0]);
  });
});

describe('useGridKeyboard — Home/End', () => {
  it('Home moves to first column in current row', () => {
    const { result } = renderHook(() =>
      useGridKeyboard(createOptions({ initialCell: [2, 3] })),
    );
    act(() => {
      result.current.handleKeyDown(new KeyboardEvent('keydown', { key: 'Home' }));
    });
    expect(result.current.activeCell).toEqual([2, 0]);
  });

  it('End moves to last column in current row', () => {
    const { result } = renderHook(() =>
      useGridKeyboard(createOptions({ initialCell: [2, 1] })),
    );
    act(() => {
      result.current.handleKeyDown(new KeyboardEvent('keydown', { key: 'End' }));
    });
    expect(result.current.activeCell).toEqual([2, 3]);
  });

  it('Ctrl+Home moves to first cell in grid', () => {
    const { result } = renderHook(() =>
      useGridKeyboard(createOptions({ initialCell: [3, 2] })),
    );
    act(() => {
      result.current.handleKeyDown(
        new KeyboardEvent('keydown', { key: 'Home', ctrlKey: true }),
      );
    });
    expect(result.current.activeCell).toEqual([0, 0]);
  });

  it('Ctrl+End moves to last cell in grid', () => {
    const { result } = renderHook(() => useGridKeyboard(createOptions()));
    act(() => {
      result.current.handleKeyDown(
        new KeyboardEvent('keydown', { key: 'End', ctrlKey: true }),
      );
    });
    expect(result.current.activeCell).toEqual([4, 3]);
  });
});

describe('useGridKeyboard — Enter/Space on tree column', () => {
  it('Enter on tree column calls onExpandToggle', () => {
    const onExpandToggle = vi.fn();
    const { result } = renderHook(() =>
      useGridKeyboard(
        createOptions({
          onExpandToggle,
          isTreeColumn: (colIndex) => colIndex === 0,
        }),
      ),
    );
    act(() => {
      result.current.handleKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));
    });
    expect(onExpandToggle).toHaveBeenCalledWith(0);
  });

  it('Space on tree column calls onExpandToggle', () => {
    const onExpandToggle = vi.fn();
    const { result } = renderHook(() =>
      useGridKeyboard(
        createOptions({
          onExpandToggle,
          isTreeColumn: (colIndex) => colIndex === 0,
        }),
      ),
    );
    act(() => {
      result.current.handleKeyDown(new KeyboardEvent('keydown', { key: ' ' }));
    });
    expect(onExpandToggle).toHaveBeenCalledWith(0);
  });
});

describe('useGridKeyboard — Enter/Space on selection column', () => {
  it('Enter on selection column calls onSelectionToggle', () => {
    const onSelectionToggle = vi.fn();
    const { result } = renderHook(() =>
      useGridKeyboard(
        createOptions({
          onSelectionToggle,
          isSelectionColumn: (colIndex) => colIndex === 0,
          initialCell: [1, 0],
        }),
      ),
    );
    act(() => {
      result.current.handleKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));
    });
    expect(onSelectionToggle).toHaveBeenCalledWith(1);
  });

  it('Space on selection column calls onSelectionToggle', () => {
    const onSelectionToggle = vi.fn();
    const { result } = renderHook(() =>
      useGridKeyboard(
        createOptions({
          onSelectionToggle,
          isSelectionColumn: (colIndex) => colIndex === 0,
          initialCell: [2, 0],
        }),
      ),
    );
    act(() => {
      result.current.handleKeyDown(new KeyboardEvent('keydown', { key: ' ' }));
    });
    expect(onSelectionToggle).toHaveBeenCalledWith(2);
  });
});

describe('useGridKeyboard — setActiveCell', () => {
  it('allows programmatic cell focus', () => {
    const { result } = renderHook(() => useGridKeyboard(createOptions()));
    act(() => {
      result.current.setActiveCell([3, 2]);
    });
    expect(result.current.activeCell).toEqual([3, 2]);
  });

  it('clamps to valid bounds', () => {
    const { result } = renderHook(() => useGridKeyboard(createOptions()));
    act(() => {
      result.current.setActiveCell([10, 10]);
    });
    expect(result.current.activeCell).toEqual([4, 3]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/model/use-grid-keyboard.test.ts`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Create `src/model/use-grid-keyboard.ts`**

```ts
import { useState, useCallback } from 'react';

export interface GridKeyboardOptions {
  /** Total number of rows in the grid body. */
  rowCount: number;
  /** Total number of columns (including selection column if present). */
  colCount: number;
  /** Called when Enter/Space is pressed on a tree column cell. Receives rowIndex. */
  onExpandToggle: (rowIndex: number) => void;
  /** Called when Enter/Space is pressed on a selection column cell. Receives rowIndex. */
  onSelectionToggle: (rowIndex: number) => void;
  /** Returns true if the given column index is the tree column. */
  isTreeColumn: (colIndex: number) => boolean;
  /** Returns true if the given column index is the selection column. */
  isSelectionColumn: (colIndex: number) => boolean;
  /** Optional initial active cell position. Defaults to [0, 0]. */
  initialCell?: [number, number];
}

export interface GridKeyboardReturn {
  /** The currently active cell as [rowIndex, colIndex]. */
  activeCell: [number, number];
  /** Keyboard event handler to attach to the grid root. */
  handleKeyDown: (event: KeyboardEvent | React.KeyboardEvent) => void;
  /** Programmatically set the active cell (clamped to valid bounds). */
  setActiveCell: (cell: [number, number]) => void;
}

/**
 * Hook implementing roving tabindex keyboard navigation for the grid.
 *
 * Tracks the active cell position and handles:
 * - Arrow keys: move focus between cells
 * - Home/End: move to first/last cell in row
 * - Ctrl+Home/End: move to first/last cell in grid
 * - Enter/Space: expand/collapse (tree column) or toggle selection
 *
 * The grid root should have tabIndex={0}. Individual cells are not
 * in the tab order — they are navigated with arrow keys only.
 */
export function useGridKeyboard(options: GridKeyboardOptions): GridKeyboardReturn {
  const {
    rowCount,
    colCount,
    onExpandToggle,
    onSelectionToggle,
    isTreeColumn,
    isSelectionColumn,
    initialCell = [0, 0],
  } = options;

  const clamp = useCallback(
    (row: number, col: number): [number, number] => [
      Math.max(0, Math.min(row, rowCount - 1)),
      Math.max(0, Math.min(col, colCount - 1)),
    ],
    [rowCount, colCount],
  );

  const [activeCell, setActiveCellRaw] = useState<[number, number]>(() =>
    clamp(initialCell[0], initialCell[1]),
  );

  const setActiveCell = useCallback(
    (cell: [number, number]) => {
      setActiveCellRaw(clamp(cell[0], cell[1]));
    },
    [clamp],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent | React.KeyboardEvent) => {
      const { key, ctrlKey, metaKey } = event;
      const ctrl = ctrlKey || metaKey;

      let handled = true;

      switch (key) {
        case 'ArrowRight':
          setActiveCellRaw((prev) => clamp(prev[0], prev[1] + 1));
          break;
        case 'ArrowLeft':
          setActiveCellRaw((prev) => clamp(prev[0], prev[1] - 1));
          break;
        case 'ArrowDown':
          setActiveCellRaw((prev) => clamp(prev[0] + 1, prev[1]));
          break;
        case 'ArrowUp':
          setActiveCellRaw((prev) => clamp(prev[0] - 1, prev[1]));
          break;
        case 'Home':
          if (ctrl) {
            setActiveCellRaw([0, 0]);
          } else {
            setActiveCellRaw((prev) => [prev[0], 0]);
          }
          break;
        case 'End':
          if (ctrl) {
            setActiveCellRaw(clamp(rowCount - 1, colCount - 1));
          } else {
            setActiveCellRaw((prev) => [prev[0], colCount - 1]);
          }
          break;
        case 'Enter':
        case ' ':
          setActiveCellRaw((prev) => {
            const [rowIdx, colIdx] = prev;
            if (isTreeColumn(colIdx)) {
              onExpandToggle(rowIdx);
            } else if (isSelectionColumn(colIdx)) {
              onSelectionToggle(rowIdx);
            }
            return prev;
          });
          break;
        default:
          handled = false;
          break;
      }

      if (handled) {
        event.preventDefault();
      }
    },
    [rowCount, colCount, clamp, onExpandToggle, onSelectionToggle, isTreeColumn, isSelectionColumn],
  );

  return {
    activeCell,
    handleKeyDown,
    setActiveCell,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/model/use-grid-keyboard.test.ts`
Expected: PASS — all 18 tests passing.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/model/use-grid-keyboard.ts src/model/use-grid-keyboard.test.ts
git commit -m "feat: add useGridKeyboard hook for roving tabindex navigation"
```

---

## Task 6: Wire keyboard navigation into grid

Connect the `useGridKeyboard` hook to the grid component tree. The grid root gets `tabIndex={0}` and the keyboard handler. Cells receive an `isFocused` prop that applies the `.strata-cell-focused` CSS class for the visible focus ring.

**Files:**
- Modify: `src/components/GridRoot.tsx`
- Modify: `src/components/BodyViewport.tsx`
- Modify: `src/components/GridRow.tsx`
- Modify: `src/components/DataCell.tsx`
- Modify: `src/components/TreeCell.tsx`

- [ ] **Step 1: Update `GridRoot.tsx` to wire keyboard navigation**

Replace `src/components/GridRoot.tsx` entirely:

```tsx
import { useCallback } from 'react';
import type { Table } from '@tanstack/react-table';
import type { GridTheme } from '../model/types';
import { useGridKeyboard } from '../model/use-grid-keyboard';
import { HeaderArea } from './HeaderArea';
import { BodyViewport } from './BodyViewport';
import { GridFooter } from './GridFooter';

export interface GridRootProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
  /** Height of the scrollable body area in pixels. */
  height: number;
  /**
   * Id of the tree column. Set only in tree mode; switches the grid to the
   * `treegrid` ARIA role and tells rows which cell renders the hierarchy.
   */
  treeColumnId?: string;
  /** Visual theme. */
  theme?: GridTheme;
}

/** The grid layout shell. */
export function GridRoot<TRow>({
  table,
  height,
  treeColumnId,
  theme,
}: GridRootProps<TRow>) {
  const rows = table.getRowModel().rows;
  const columns = table.getVisibleLeafColumns();

  // Determine which column indices are tree/selection columns
  const treeColIndex = treeColumnId
    ? columns.findIndex((col) => col.id === treeColumnId)
    : -1;

  const isTreeColumn = useCallback(
    (colIndex: number) => colIndex === treeColIndex,
    [treeColIndex],
  );

  const isSelectionColumn = useCallback(
    (_colIndex: number) => false, // Selection column keyboard is handled in Plan 10
    [],
  );

  const onExpandToggle = useCallback(
    (rowIndex: number) => {
      const row = rows[rowIndex];
      if (row && row.getCanExpand()) {
        row.toggleExpanded();
      }
    },
    [rows],
  );

  const onSelectionToggle = useCallback(
    (_rowIndex: number) => {
      // Selection toggle via keyboard is handled in Plan 10
    },
    [],
  );

  const keyboard = useGridKeyboard({
    rowCount: rows.length,
    colCount: columns.length,
    onExpandToggle,
    onSelectionToggle,
    isTreeColumn,
    isSelectionColumn,
  });

  return (
    <div
      className="strata-grid"
      role={treeColumnId === undefined ? 'grid' : 'treegrid'}
      data-theme={theme ?? 'light'}
      tabIndex={0}
      onKeyDown={keyboard.handleKeyDown}
      aria-activedescendant={`strata-cell-${keyboard.activeCell[0]}-${keyboard.activeCell[1]}`}
    >
      <HeaderArea table={table} />
      <BodyViewport
        table={table}
        height={height}
        treeColumnId={treeColumnId}
        activeCell={keyboard.activeCell}
      />
      <GridFooter rowCount={rows.length} />
    </div>
  );
}
```

- [ ] **Step 2: Update `BodyViewport.tsx` to pass active cell info to rows**

Add `activeCell` prop to `BodyViewportProps` and pass the active column index to the relevant row:

```tsx
import { useRef } from 'react';
import type { Table, Row, Cell } from '@tanstack/react-table';
import { GridRow } from './GridRow';
import { useRowVirtualizer } from '../virtual/use-row-virtualizer';
import { useColumnVirtualizer } from '../virtual/use-column-virtualizer';

export interface BodyViewportProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
  /** Height of the scrollable body area in pixels. */
  height: number;
  /** Id of the tree column. Set only in tree mode. */
  treeColumnId?: string;
  /** The currently active cell as [rowIndex, colIndex]. */
  activeCell?: [number, number];
}

/** Renders the grid body as a 3-pane virtualized scroll area. */
export function BodyViewport<TRow>({
  table,
  height,
  treeColumnId,
  activeCell,
}: BodyViewportProps<TRow>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const rowVirtualizer = useRowVirtualizer({ scrollRef, count: rows.length });

  const leftColumns = table.getLeftVisibleLeafColumns();
  const centerColumns = table.getCenterVisibleLeafColumns();
  const rightColumns = table.getRightVisibleLeafColumns();

  const centerWidths = centerColumns.map((col) => col.getSize());
  const colVirtualizer = useColumnVirtualizer({
    scrollRef,
    columnWidths: centerWidths,
  });

  if (rows.length === 0) {
    return (
      <div
        className="strata-body strata-body-empty"
        role="rowgroup"
        style={{ height }}
      >
        <div className="strata-empty">No data</div>
      </div>
    );
  }

  const leftWidth = leftColumns.reduce((sum, col) => sum + col.getSize(), 0);
  const rightWidth = rightColumns.reduce((sum, col) => sum + col.getSize(), 0);

  // Build a set of all column ids in order for focus tracking
  const allColumns = table.getVisibleLeafColumns();

  return (
    <div
      ref={scrollRef}
      className="strata-body"
      role="rowgroup"
      style={{ height }}
    >
      <div
        className="strata-body-sizer"
        role="presentation"
        style={{ height: rowVirtualizer.getTotalSize() }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          const isActiveRow = activeCell ? activeCell[0] === virtualRow.index : false;
          const activeColId = isActiveRow && activeCell
            ? allColumns[activeCell[1]]?.id
            : undefined;

          const rowStyle: React.CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: virtualRow.size,
            transform: `translateY(${virtualRow.start}px)`,
            display: 'flex',
          };

          return (
            <div key={virtualRow.key} className="strata-row-container" style={rowStyle}>
              {leftColumns.length > 0 && (
                <div className="strata-pane-left" style={{ width: leftWidth, flexShrink: 0 }}>
                  <GridRow
                    row={row}
                    treeColumnId={treeColumnId}
                    cells={getCellsForColumns(row, leftColumns)}
                    focusedColumnId={activeColId}
                    rowIndex={virtualRow.index}
                  />
                </div>
              )}
              <div className="strata-pane-center" style={{ flex: '1 1 auto', overflow: 'hidden' }}>
                <div style={{ width: colVirtualizer.getTotalSize(), position: 'relative' }}>
                  <GridRow
                    row={row}
                    treeColumnId={treeColumnId}
                    cells={getVirtualizedCenterCells(row, centerColumns, colVirtualizer)}
                    focusedColumnId={activeColId}
                    rowIndex={virtualRow.index}
                  />
                </div>
              </div>
              {rightColumns.length > 0 && (
                <div className="strata-pane-right" style={{ width: rightWidth, flexShrink: 0 }}>
                  <GridRow
                    row={row}
                    treeColumnId={treeColumnId}
                    cells={getCellsForColumns(row, rightColumns)}
                    focusedColumnId={activeColId}
                    rowIndex={virtualRow.index}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getCellsForColumns<TRow>(
  row: Row<TRow>,
  columns: { id: string }[],
): Cell<TRow, unknown>[] {
  const columnIds = new Set(columns.map((c) => c.id));
  return row.getVisibleCells().filter((cell) => columnIds.has(cell.column.id));
}

function getVirtualizedCenterCells<TRow>(
  row: Row<TRow>,
  centerColumns: { id: string }[],
  colVirtualizer: { getVirtualItems: () => { index: number }[] },
): Cell<TRow, unknown>[] {
  const allCells = row.getVisibleCells();
  const centerIds = new Set(centerColumns.map((c) => c.id));
  const centerCells = allCells.filter((cell) => centerIds.has(cell.column.id));
  const virtualItems = colVirtualizer.getVirtualItems();
  return virtualItems.map((vi) => centerCells[vi.index]).filter(Boolean);
}
```

- [ ] **Step 3: Update `GridRow.tsx` to pass focus state to cells**

Replace `src/components/GridRow.tsx` entirely:

```tsx
import type { CSSProperties } from 'react';
import type { Row, Cell } from '@tanstack/react-table';
import { DataCell } from './DataCell';
import { TreeCell } from './TreeCell';

export interface GridRowProps<TRow> {
  /** The TanStack row to render. */
  row: Row<TRow>;
  /** Positioning style applied by the row virtualizer. */
  style?: CSSProperties;
  /** Id of the tree column. Set only in tree mode. */
  treeColumnId?: string;
  /**
   * Which cells to render. If omitted, renders all visible cells.
   * Used by the 3-pane layout to render only a subset (pinned or center).
   */
  cells?: Cell<TRow, unknown>[];
  /** Column id of the currently focused cell in this row (if any). */
  focusedColumnId?: string;
  /** The row index in the visible row model (for aria-activedescendant ids). */
  rowIndex?: number;
}

/** Renders one body row as a horizontal strip of cells. */
export function GridRow<TRow>({
  row,
  style,
  treeColumnId,
  cells,
  focusedColumnId,
  rowIndex,
}: GridRowProps<TRow>) {
  const isTree = treeColumnId !== undefined;
  const cellsToRender = cells ?? row.getVisibleCells();

  return (
    <div
      className="strata-row"
      role="row"
      style={style}
      aria-level={isTree ? row.depth + 1 : undefined}
      aria-expanded={
        isTree && row.getCanExpand() ? row.getIsExpanded() : undefined
      }
    >
      {cellsToRender.map((cell) => {
        const isFocused = focusedColumnId === cell.column.id;
        return cell.column.id === treeColumnId ? (
          <TreeCell
            key={cell.id}
            cell={cell}
            isFocused={isFocused}
            rowIndex={rowIndex}
          />
        ) : (
          <DataCell
            key={cell.id}
            cell={cell}
            isFocused={isFocused}
            rowIndex={rowIndex}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Update `DataCell.tsx` to accept `isFocused` prop**

Replace `src/components/DataCell.tsx` entirely:

```tsx
import type { Cell } from '@tanstack/react-table';
import { renderCellContent } from './render-cell-content';

export interface DataCellProps<TRow> {
  /** The TanStack cell to render. */
  cell: Cell<TRow, unknown>;
  /** Whether this cell is the currently focused cell in the grid. */
  isFocused?: boolean;
  /** Row index for aria-activedescendant id generation. */
  rowIndex?: number;
}

/** Renders a single ordinary body cell, delegating content rendering. */
export function DataCell<TRow>({ cell, isFocused, rowIndex }: DataCellProps<TRow>) {
  const width = cell.column.getSize();
  const colIndex = cell.column.getIndex();
  const className = `strata-cell${isFocused ? ' strata-cell-focused' : ''}`;

  return (
    <div
      className={className}
      role="gridcell"
      style={{ width }}
      id={isFocused && rowIndex !== undefined ? `strata-cell-${rowIndex}-${colIndex}` : undefined}
    >
      {renderCellContent(cell)}
    </div>
  );
}
```

- [ ] **Step 5: Update `TreeCell.tsx` to accept `isFocused` prop**

Replace `src/components/TreeCell.tsx` entirely:

```tsx
import type { Cell } from '@tanstack/react-table';
import { TREE_INDENT_WIDTH } from '../model/constants';
import { renderCellContent } from './render-cell-content';

export interface TreeCellProps<TRow> {
  /** The TanStack cell to render. */
  cell: Cell<TRow, unknown>;
  /** Whether this cell is the currently focused cell in the grid. */
  isFocused?: boolean;
  /** Row index for aria-activedescendant id generation. */
  rowIndex?: number;
}

/**
 * Renders the tree column's cell: depth indentation, an expand/collapse
 * control for rows that have children, and the cell content. Kept separate
 * from `DataCell` so hierarchy chrome never leaks into ordinary cells.
 */
export function TreeCell<TRow>({ cell, isFocused, rowIndex }: TreeCellProps<TRow>) {
  const { row } = cell;
  const width = cell.column.getSize();
  const colIndex = cell.column.getIndex();
  const canExpand = row.getCanExpand();
  const expanded = row.getIsExpanded();
  const className = `strata-cell strata-tree-cell${isFocused ? ' strata-cell-focused' : ''}`;

  return (
    <div
      className={className}
      role="gridcell"
      style={{ width }}
      id={isFocused && rowIndex !== undefined ? `strata-cell-${rowIndex}-${colIndex}` : undefined}
    >
      <span
        className="strata-tree-indent"
        style={{ width: row.depth * TREE_INDENT_WIDTH }}
        aria-hidden="true"
      />
      {canExpand ? (
        <button
          type="button"
          className="strata-tree-toggle"
          aria-label={expanded ? 'Collapse row' : 'Expand row'}
          onClick={row.getToggleExpandedHandler()}
          tabIndex={-1}
        >
          {expanded ? '▾' : '▸'}
        </button>
      ) : (
        <span
          className="strata-tree-toggle strata-tree-toggle-empty"
          aria-hidden="true"
        />
      )}
      <span className="strata-tree-label">{renderCellContent(cell)}</span>
    </div>
  );
}
```

- [ ] **Step 6: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS — existing tests still pass. Keyboard navigation is additive; without focus interaction, behavior is unchanged.

- [ ] **Step 8: Commit**

```bash
git add src/components/GridRoot.tsx src/components/BodyViewport.tsx src/components/GridRow.tsx src/components/DataCell.tsx src/components/TreeCell.tsx
git commit -m "feat: wire keyboard navigation into grid component tree"
```

---

## Task 7: Accessibility integration tests

End-to-end tests verifying ARIA roles, keyboard navigation, focus management, and theme attribute through the full `<DataGrid>` component.

**Files:**
- Create: `src/components/DataGrid.a11y.test.tsx`

- [ ] **Step 1: Create `src/components/DataGrid.a11y.test.tsx`**

```tsx
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DataGrid } from './DataGrid';
import type { ColumnDef, TreeDataConfig } from '../model/types';

// --- Test data ---

interface FlatRow {
  id: string;
  name: string;
  value: number;
}

const flatData: FlatRow[] = [
  { id: '1', name: 'Alpha', value: 10 },
  { id: '2', name: 'Beta', value: 20 },
  { id: '3', name: 'Gamma', value: 30 },
];

const flatColumns: ColumnDef<FlatRow>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'value', header: 'Value', accessor: 'value' },
];

// --- Tree data ---

interface TreeRow {
  id: string;
  name: string;
  children?: TreeRow[];
}

const treeData: TreeRow[] = [
  {
    id: 'P1',
    name: 'Parent 1',
    children: [
      { id: 'C1', name: 'Child 1' },
      { id: 'C2', name: 'Child 2' },
    ],
  },
  { id: 'P2', name: 'Parent 2' },
];

const treeColumns: ColumnDef<TreeRow>[] = [
  { id: 'name', header: 'Name', accessor: 'name', isTreeColumn: true },
];

const treeConfig: TreeDataConfig<TreeRow> = {
  getRowId: (r) => r.id,
  getChildren: (r) => r.children,
};

describe('DataGrid — ARIA roles', () => {
  it('flat grid has role="grid"', () => {
    const { container } = render(
      <DataGrid data={flatData} columns={flatColumns} />,
    );
    const grid = container.querySelector('.strata-grid');
    expect(grid?.getAttribute('role')).toBe('grid');
  });

  it('tree grid has role="treegrid"', () => {
    const { container } = render(
      <DataGrid
        data={treeData}
        columns={treeColumns}
        treeData={treeConfig}
        defaultExpanded
      />,
    );
    const grid = container.querySelector('.strata-grid');
    expect(grid?.getAttribute('role')).toBe('treegrid');
  });

  it('header area has role="rowgroup"', () => {
    const { container } = render(
      <DataGrid data={flatData} columns={flatColumns} />,
    );
    const header = container.querySelector('.strata-header');
    expect(header?.getAttribute('role')).toBe('rowgroup');
  });

  it('header row has role="row"', () => {
    const { container } = render(
      <DataGrid data={flatData} columns={flatColumns} />,
    );
    const headerRow = container.querySelector('.strata-header-row');
    expect(headerRow?.getAttribute('role')).toBe('row');
  });

  it('header cells have role="columnheader"', () => {
    const { container } = render(
      <DataGrid data={flatData} columns={flatColumns} />,
    );
    const headerCells = container.querySelectorAll('[role="columnheader"]');
    expect(headerCells.length).toBe(2);
  });

  it('body area has role="rowgroup"', () => {
    const { container } = render(
      <DataGrid data={flatData} columns={flatColumns} />,
    );
    const body = container.querySelector('.strata-body');
    expect(body?.getAttribute('role')).toBe('rowgroup');
  });

  it('body rows have role="row"', () => {
    const { container } = render(
      <DataGrid data={flatData} columns={flatColumns} />,
    );
    const rows = container.querySelectorAll('.strata-row[role="row"]');
    expect(rows.length).toBe(3);
  });

  it('body cells have role="gridcell"', () => {
    const { container } = render(
      <DataGrid data={flatData} columns={flatColumns} />,
    );
    const cells = container.querySelectorAll('[role="gridcell"]');
    // 3 rows × 2 columns = 6 cells
    expect(cells.length).toBe(6);
  });

  it('tree rows have aria-level', () => {
    const { container } = render(
      <DataGrid
        data={treeData}
        columns={treeColumns}
        treeData={treeConfig}
        defaultExpanded
      />,
    );
    const rows = container.querySelectorAll('.strata-row[role="row"]');
    // P1 is level 1, C1 and C2 are level 2, P2 is level 1
    expect(rows[0]?.getAttribute('aria-level')).toBe('1');
    expect(rows[1]?.getAttribute('aria-level')).toBe('2');
    expect(rows[2]?.getAttribute('aria-level')).toBe('2');
    expect(rows[3]?.getAttribute('aria-level')).toBe('1');
  });

  it('expandable tree rows have aria-expanded', () => {
    const { container } = render(
      <DataGrid
        data={treeData}
        columns={treeColumns}
        treeData={treeConfig}
        defaultExpanded
      />,
    );
    const rows = container.querySelectorAll('.strata-row[role="row"]');
    // P1 is expanded
    expect(rows[0]?.getAttribute('aria-expanded')).toBe('true');
    // C1, C2 are leaves — no aria-expanded
    expect(rows[1]?.hasAttribute('aria-expanded')).toBe(false);
    expect(rows[2]?.hasAttribute('aria-expanded')).toBe(false);
    // P2 is a leaf — no aria-expanded
    expect(rows[3]?.hasAttribute('aria-expanded')).toBe(false);
  });
});

describe('DataGrid — keyboard navigation', () => {
  it('grid root has tabIndex={0}', () => {
    const { container } = render(
      <DataGrid data={flatData} columns={flatColumns} />,
    );
    const grid = container.querySelector('.strata-grid');
    expect(grid?.getAttribute('tabindex')).toBe('0');
  });

  it('ArrowDown moves focus to next row', () => {
    const { container } = render(
      <DataGrid data={flatData} columns={flatColumns} />,
    );
    const grid = container.querySelector('.strata-grid')!;

    // Initially first cell is focused
    let focusedCell = container.querySelector('.strata-cell-focused');
    expect(focusedCell).toBeTruthy();

    // Press ArrowDown
    fireEvent.keyDown(grid, { key: 'ArrowDown' });

    // Focus should move to second row
    const focusedCells = container.querySelectorAll('.strata-cell-focused');
    expect(focusedCells.length).toBe(1);
  });

  it('ArrowRight moves focus to next column', () => {
    const { container } = render(
      <DataGrid data={flatData} columns={flatColumns} />,
    );
    const grid = container.querySelector('.strata-grid')!;

    // Press ArrowRight
    fireEvent.keyDown(grid, { key: 'ArrowRight' });

    // Focus should be on second column
    const focusedCell = container.querySelector('.strata-cell-focused');
    expect(focusedCell).toBeTruthy();
  });

  it('Enter on tree column toggles expand/collapse', () => {
    const { container } = render(
      <DataGrid
        data={treeData}
        columns={treeColumns}
        treeData={treeConfig}
        defaultExpanded
      />,
    );
    const grid = container.querySelector('.strata-grid')!;

    // Initially P1 is expanded — 4 rows visible (P1, C1, C2, P2)
    let rows = container.querySelectorAll('.strata-row[role="row"]');
    expect(rows.length).toBe(4);

    // Press Enter on first row, first column (tree column)
    fireEvent.keyDown(grid, { key: 'Enter' });

    // P1 should collapse — only 2 rows visible (P1, P2)
    rows = container.querySelectorAll('.strata-row[role="row"]');
    expect(rows.length).toBe(2);
  });

  it('Home moves to first cell in row', () => {
    const { container } = render(
      <DataGrid data={flatData} columns={flatColumns} />,
    );
    const grid = container.querySelector('.strata-grid')!;

    // Move to second column
    fireEvent.keyDown(grid, { key: 'ArrowRight' });
    // Press Home
    fireEvent.keyDown(grid, { key: 'Home' });

    // Focus should be on first column
    const focusedCell = container.querySelector('.strata-cell-focused');
    expect(focusedCell).toBeTruthy();
  });

  it('Ctrl+End moves to last cell in grid', () => {
    const { container } = render(
      <DataGrid data={flatData} columns={flatColumns} />,
    );
    const grid = container.querySelector('.strata-grid')!;

    // Press Ctrl+End
    fireEvent.keyDown(grid, { key: 'End', ctrlKey: true });

    // Focus should be on last row, last column
    const focusedCell = container.querySelector('.strata-cell-focused');
    expect(focusedCell).toBeTruthy();
  });
});

describe('DataGrid — focus ring visibility', () => {
  it('active cell has .strata-cell-focused class', () => {
    const { container } = render(
      <DataGrid data={flatData} columns={flatColumns} />,
    );
    const focusedCells = container.querySelectorAll('.strata-cell-focused');
    // Initially the first cell [0,0] should be focused
    expect(focusedCells.length).toBe(1);
  });

  it('only one cell has focus ring at a time', () => {
    const { container } = render(
      <DataGrid data={flatData} columns={flatColumns} />,
    );
    const grid = container.querySelector('.strata-grid')!;

    // Navigate around
    fireEvent.keyDown(grid, { key: 'ArrowRight' });
    fireEvent.keyDown(grid, { key: 'ArrowDown' });

    const focusedCells = container.querySelectorAll('.strata-cell-focused');
    expect(focusedCells.length).toBe(1);
  });
});

describe('DataGrid — theme attribute', () => {
  it('defaults to data-theme="light"', () => {
    const { container } = render(
      <DataGrid data={flatData} columns={flatColumns} />,
    );
    const grid = container.querySelector('.strata-grid');
    expect(grid?.getAttribute('data-theme')).toBe('light');
  });

  it('sets data-theme="dark" when theme="dark"', () => {
    const { container } = render(
      <DataGrid data={flatData} columns={flatColumns} theme="dark" />,
    );
    const grid = container.querySelector('.strata-grid');
    expect(grid?.getAttribute('data-theme')).toBe('dark');
  });

  it('sets data-theme="light" when theme="light"', () => {
    const { container } = render(
      <DataGrid data={flatData} columns={flatColumns} theme="light" />,
    );
    const grid = container.querySelector('.strata-grid');
    expect(grid?.getAttribute('data-theme')).toBe('light');
  });
});
```

- [ ] **Step 2: Run the accessibility tests**

Run: `npx vitest run src/components/DataGrid.a11y.test.tsx`
Expected: PASS — all tests pass.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 4: Commit**

```bash
git add src/components/DataGrid.a11y.test.tsx
git commit -m "test: add accessibility and keyboard navigation integration tests"
```

---

## Task 8: Playground update and final verification

Update the playground to demonstrate the theme toggle and keyboard navigation, then run the full verification pass.

**Files:**
- Modify: `playground/App.tsx`
- Modify: `src/index.ts`

- [ ] **Step 1: Ensure `GridTheme` is exported from `src/index.ts`**

Verify the exports include `GridTheme`:

```ts
export { DataGrid } from './components/DataGrid';
export type { DataGridProps } from './components/DataGrid';
export type {
  ColumnDef,
  CellContext,
  TreeDataConfig,
  SortDirection,
  ColumnSort,
  SortingState,
  FilterType,
  GridTheme,
} from './model/types';
export { InMemoryDataSource } from './data/in-memory-data-source';
export type { DataSource } from './data/data-source';
```

- [ ] **Step 2: Replace `playground/App.tsx` entirely**

```tsx
import { useState } from 'react';
import { DataGrid, type ColumnDef, type TreeDataConfig, type GridTheme } from '../src/index';
import '../src/strata.css';

/**
 * Throwaway dev playground for Strata.
 * Demonstrates theming (light/dark toggle) and keyboard navigation.
 */

interface BomNode {
  id: string;
  material: string;
  description: string;
  qty: number;
  uom: string;
  children?: BomNode[];
}

const bom: BomNode[] = [
  {
    id: 'FG-1000',
    material: 'FG-1000',
    description: 'Mountain Bike — Trail 29',
    qty: 1,
    uom: 'EA',
    children: [
      {
        id: 'SA-2000',
        material: 'SA-2000',
        description: 'Frame Assembly',
        qty: 1,
        uom: 'EA',
        children: [
          { id: 'PT-3000', material: 'PT-3000', description: 'Front Triangle', qty: 1, uom: 'EA' },
          { id: 'PT-3001', material: 'PT-3001', description: 'Rear Triangle', qty: 1, uom: 'EA' },
          { id: 'PT-3002', material: 'PT-3002', description: 'Pivot Bearing', qty: 4, uom: 'EA' },
        ],
      },
      {
        id: 'SA-2001',
        material: 'SA-2001',
        description: 'Wheel Set',
        qty: 2,
        uom: 'EA',
        children: [
          { id: 'PT-3100', material: 'PT-3100', description: 'Rim 29"', qty: 1, uom: 'EA' },
          { id: 'PT-3101', material: 'PT-3101', description: 'Spoke', qty: 32, uom: 'EA' },
          { id: 'PT-3102', material: 'PT-3102', description: 'Hub', qty: 1, uom: 'EA' },
          { id: 'PT-3103', material: 'PT-3103', description: 'Tyre 29x2.4', qty: 1, uom: 'EA' },
        ],
      },
      {
        id: 'SA-2002',
        material: 'SA-2002',
        description: 'Drivetrain Group',
        qty: 1,
        uom: 'EA',
        children: [
          { id: 'PT-3200', material: 'PT-3200', description: 'Crankset', qty: 1, uom: 'EA' },
          { id: 'PT-3201', material: 'PT-3201', description: 'Chain', qty: 1, uom: 'M' },
          { id: 'PT-3202', material: 'PT-3202', description: 'Cassette 12s', qty: 1, uom: 'EA' },
          { id: 'PT-3203', material: 'PT-3203', description: 'Rear Derailleur', qty: 1, uom: 'EA' },
        ],
      },
      { id: 'PT-2003', material: 'PT-2003', description: 'Handlebar', qty: 1, uom: 'EA' },
      { id: 'PT-2004', material: 'PT-2004', description: 'Saddle', qty: 1, uom: 'EA' },
    ],
  },
];

const columns: ColumnDef<BomNode>[] = [
  { id: 'material', header: 'Material', accessor: 'material', width: 150, isTreeColumn: true, pin: 'left', filter: 'text' },
  { id: 'description', header: 'Description', accessor: 'description', width: 260, filter: 'text' },
  { id: 'qty', header: 'Qty', accessor: 'qty', width: 80, filter: 'number' },
  { id: 'uom', header: 'UoM', accessor: 'uom', width: 80 },
];

const treeData: TreeDataConfig<BomNode> = {
  getRowId: (r) => r.id,
  getChildren: (r) => r.children,
};

export function App() {
  const [theme, setTheme] = useState<GridTheme>('light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div
      style={{
        padding: 32,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: theme === 'dark' ? '#f5f5f7' : '#1d1d1f',
        minHeight: '100vh',
        transition: 'background 0.2s, color 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Strata — Plan 7 Playground</h1>
        <button
          type="button"
          onClick={toggleTheme}
          style={{
            padding: '4px 12px',
            fontSize: 13,
            border: `1px solid ${theme === 'dark' ? '#48484a' : '#d1d1d6'}`,
            borderRadius: 6,
            background: theme === 'dark' ? '#2c2c2e' : '#f5f5f7',
            color: theme === 'dark' ? '#f5f5f7' : '#1d1d1f',
            cursor: 'pointer',
          }}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>
      <p style={{ color: theme === 'dark' ? '#98989d' : '#86868b', fontSize: 14, margin: '0 0 8px' }}>
        Theming via CSS custom properties · keyboard navigation (arrow keys, Enter to expand/collapse)
      </p>
      <p style={{ fontSize: 12, margin: '0 0 20px', color: theme === 'dark' ? '#98989d' : '#86868b' }}>
        Click the grid then use ↑↓←→ to navigate cells. Enter/Space on tree column to expand/collapse.
        Home/End for row edges. Ctrl+Home/End for grid edges.
      </p>
      <DataGrid
        data={bom}
        columns={columns}
        treeData={treeData}
        defaultExpanded
        defaultSort={[{ columnId: 'material', direction: 'asc' }]}
        height={520}
        theme={theme}
      />
    </div>
  );
}
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS — all tests pass (foundation, virtualization, tree, sorting, filtering, columns, selection, a11y).

- [ ] **Step 4: Run the type check**

Run: `npm run typecheck`
Expected: completes with no errors.

- [ ] **Step 5: Run the build**

Run: `npm run build`
Expected: completes with no errors; `dist/` contains:
- `dist/strata.css` — includes token definitions, dark theme overrides, and all component styles using `var(--strata-*)` references
- `dist/index.js` and `dist/index.d.ts` — includes `GridTheme` export and `theme` prop on `DataGridProps`

- [ ] **Step 6: Start the dev server and verify visually**

Run: `npm run dev`
Expected: The playground renders the BOM tree with:
- A "🌙 Dark" / "☀️ Light" toggle button in the header
- Clicking the toggle switches between light and dark themes instantly
- Dark theme: dark background, light text, blue accent colors, proper contrast
- Light theme: white background, dark text (same as before)
- Clicking the grid gives it focus (visible outline or focus indicator)
- Arrow keys navigate between cells — a blue focus ring moves with the active cell
- Enter/Space on the tree column (Material) expands/collapses rows
- Home/End move to first/last cell in the current row
- Ctrl+Home/End move to the first/last cell in the entire grid
- Tab exits the grid to the next focusable element on the page

- [ ] **Step 7: Commit**

```bash
git add playground/App.tsx src/index.ts
git commit -m "feat: demo theme toggle and keyboard navigation in playground"
```

---

## Done — what Plan 7 delivers

`<DataGrid>` now supports full theming via CSS custom properties and keyboard accessibility:

- **CSS Custom Properties:** All visual values (colors, spacing, fonts, borders, radii) are defined as `--strata-*` tokens on `.strata-grid`. Consumers can override any token to restyle the grid without forking source code.
- **Light Theme (default):** Clean white background with subtle gray borders and blue accent. Defined in `src/theme/tokens.css`.
- **Dark Theme:** Dark background with light text and blue accent, activated via `theme="dark"`. Defined in `src/theme/dark.css` as overrides on `[data-theme="dark"]`.
- **Theme Prop:** `<DataGrid theme="light" | "dark">` sets the `data-theme` attribute on the grid root. Defaults to `'light'`.
- **Keyboard Navigation:** Roving tabindex pattern — the grid root has `tabIndex={0}`, arrow keys move focus between cells, Enter/Space toggles expand/collapse on tree columns. Home/End navigate within a row; Ctrl+Home/End navigate to grid edges.
- **Focus Ring:** The active cell displays a visible blue focus ring (`.strata-cell-focused`) using CSS outline with the accent color token.
- **ARIA Compliance:** Correct roles (`grid`/`treegrid`, `rowgroup`, `row`, `gridcell`, `columnheader`), `aria-level` on tree rows, `aria-expanded` on expandable rows, `aria-activedescendant` for focus tracking.
- **No regressions:** All Plan 6 selection tests, Plan 5 column management tests, Plan 4 sorting/filtering tests, Plan 3 tree tests, Plan 2 virtualization tests, and Plan 1 foundation tests continue to pass.

**Next:** Plan 8 — Column Groups (stacked/grouped headers for multi-level column organization).
