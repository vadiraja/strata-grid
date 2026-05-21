# Strata M1 · Plan 3 — Tree Data · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the flat grid into a tree/BOM grid — hierarchical rows with expand/collapse, depth indentation, and a tree-aware ARIA structure — engaged by a single `treeData` prop.

**Architecture:** A `treeData` prop carries either nested data (`getChildren`) or flat, parent-pointer data (`getParentId`). A pure `normalizeTreeData` function reduces both shapes to one — a list of root rows plus a `getSubRows` accessor — repairing messy ERP data (duplicate ids, orphans, cycles) along the way. `useGridTable` feeds `getSubRows` into TanStack Table's expanded row model, which flattens only the currently-visible (expanded) rows. The designated tree column renders through a new `TreeCell` that draws indentation and an expand/collapse control; all other cells stay `DataCell`. Expansion state is uncontrolled (TanStack-managed), seeded by an optional `defaultExpanded` prop.

**Tech Stack:** TypeScript, React 18/19, `@tanstack/react-table` v8 (`getExpandedRowModel`, `getSubRows`), `@tanstack/react-virtual` v3, tsup, Vitest + React Testing Library.

**Scope note:** This plan covers **tree rendering and expand/collapse only**. Tree-aware sorting and per-column filtering are **Plan 4**. Literal indent *guide lines* (connector strokes) are a theming refinement deferred to **Plan 7**; Plan 3 conveys hierarchy with depth indentation plus the expand caret. Selection (tri-state cascade) is **Plan 6**.

**Spec:** `docs/superpowers/specs/2026-05-21-strata-tree-data-grid-design.md` (§5.2, §9.1–9.2, §10, §11). Builds directly on Plan 2 (`docs/superpowers/plans/2026-05-21-strata-m1-plan-2-virtualization.md`), merged to `master`.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/model/constants.ts` | modify | Add `TREE_INDENT_WIDTH` |
| `src/model/types.ts` | modify | Add `TreeDataConfig`; add `isTreeColumn` to `ColumnDef` |
| `src/model/dev-warn.ts` | create | `devWarn` — development-only `console.warn`, stripped in production |
| `src/model/dev-warn.test.ts` | create | `devWarn` tests |
| `src/model/normalize-tree-data.ts` | create | `normalizeTreeData` — flat/nested → `{ rootRows, getSubRows }` |
| `src/model/normalize-tree-data.test.ts` | create | Normalization tests (nested, flat, orphan, duplicate, cycle) |
| `src/model/resolve-tree-column-id.ts` | create | `resolveTreeColumnId` — pick the hierarchy column |
| `src/model/resolve-tree-column-id.test.ts` | create | `resolveTreeColumnId` tests |
| `src/model/use-grid-table.ts` | modify | Accept `getSubRows`/`getRowId`/`defaultExpanded`; wire the expanded row model |
| `src/model/use-grid-table.test.ts` | modify | Add tree-mode tests |
| `src/components/render-cell-content.ts` | create | `renderCellContent` — shared cell-content rendering |
| `src/components/render-cell-content.test.ts` | create | `renderCellContent` tests |
| `src/components/DataCell.tsx` | modify | Use `renderCellContent` |
| `src/components/TreeCell.tsx` | create | Tree-column cell — indentation, expand control, content |
| `src/components/GridRow.tsx` | modify | Route the tree column to `TreeCell`; add `aria-level`/`aria-expanded` |
| `src/components/BodyViewport.tsx` | modify | Thread `treeColumnId` to rows |
| `src/components/GridRoot.tsx` | modify | Thread `treeColumnId`; switch role to `treegrid` in tree mode |
| `src/components/DataGrid.tsx` | modify | Add `treeData` + `defaultExpanded` props; normalize and wire |
| `src/components/DataGrid.tree.test.tsx` | create | Tree behavior tests (expand/collapse, indent, ARIA, flat data) |
| `src/strata.css` | modify | Tree-cell, indent, and toggle styles |
| `src/index.ts` | modify | Export `TreeDataConfig` |
| `playground/App.tsx` | modify | Multi-level indented BOM demo |

---

## Task 1: Tree-data foundations — types, indent constant, `devWarn`

Three small, dependency-free additions the rest of the plan builds on: a layout constant, the tree configuration types, and a development-warning helper used by every normalization/validation step.

**Files:**
- Modify: `src/model/constants.ts`
- Modify: `src/model/types.ts`
- Create: `src/model/dev-warn.ts`
- Test: `src/model/dev-warn.test.ts`

- [ ] **Step 1: Add the indent constant to `src/model/constants.ts`**

Append to the end of the file:

```ts

/** Horizontal indentation applied per tree depth level, in pixels. */
export const TREE_INDENT_WIDTH = 20;
```

- [ ] **Step 2: Replace `src/model/types.ts` entirely**

```ts
import type { ReactNode } from 'react';
import type { RowData } from '@tanstack/react-table';

/** Context passed to a custom cell renderer. */
export interface CellContext<TRow> {
  /** The row's underlying data object. */
  row: TRow;
  /** The value for this cell, read via the column's accessor. */
  value: unknown;
  /** The column definition this cell belongs to. */
  column: ColumnDef<TRow>;
  /** Zero-based index of the row in the current row model. */
  rowIndex: number;
}

/**
 * Definition of a single grid column.
 *
 * Later milestones extend this interface with pinning, sorting, and
 * filtering options.
 */
export interface ColumnDef<TRow> {
  /** Unique, stable column id. */
  id: string;
  /** Header content — a string or any React node. */
  header: string | ReactNode;
  /**
   * How to read this column's value from a row: a key of `TRow`, or a
   * function. When omitted, `id` is used as the key.
   */
  accessor?: keyof TRow | ((row: TRow) => unknown);
  /** Custom cell renderer. Receives cell context, returns React content. */
  cell?: (context: CellContext<TRow>) => ReactNode;
  /** Fixed column width in pixels. Defaults to `DEFAULT_COLUMN_WIDTH`. */
  width?: number;
  /** Minimum column width in pixels. Defaults to `MIN_COLUMN_WIDTH`. */
  minWidth?: number;
  /**
   * Marks this column as the tree column — the one that shows the hierarchy
   * (depth indentation and the expand/collapse control). Tree mode only;
   * exactly one column should set it. If none does, the first column is used
   * and a development warning is emitted.
   */
  isTreeColumn?: boolean;
}

/**
 * Configures tree (hierarchical / BOM) mode. Passing `treeData` to
 * `<DataGrid>` turns it into a tree grid.
 *
 * Provide **either** `getChildren` (nested data) **or** `getParentId` (flat,
 * parent-pointer data). If both are given, `getChildren` wins and a
 * development warning is emitted.
 */
export interface TreeDataConfig<TRow> {
  /** Returns a stable, unique id for a row. */
  getRowId: (row: TRow) => string;
  /** Nested data: returns a row's children, or `undefined` for a leaf. */
  getChildren?: (row: TRow) => TRow[] | undefined;
  /**
   * Flat data: returns a row's parent id, or `null`/`undefined` for a root.
   */
  getParentId?: (row: TRow) => string | null | undefined;
}

/**
 * Augments TanStack's `ColumnMeta` so every TanStack column carries the
 * original Strata column definition.
 */
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    strataColumn: ColumnDef<TData>;
  }
}
```

- [ ] **Step 3: Verify types and constants type-check**

Run: `npx tsc --noEmit`
Expected: completes with no errors.

- [ ] **Step 4: Commit the types and constant**

```bash
git add src/model/constants.ts src/model/types.ts
git commit -m "feat: add tree-data config types and indent constant"
```

- [ ] **Step 5: Write the failing test — `src/model/dev-warn.test.ts`**

```ts
import { devWarn } from './dev-warn';

describe('devWarn', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it('writes a prefixed warning outside production', () => {
    process.env.NODE_ENV = 'development';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    devWarn('something looks off');
    expect(warn).toHaveBeenCalledWith('[strata] something looks off');
  });

  it('is silent in production', () => {
    process.env.NODE_ENV = 'production';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    devWarn('something looks off');
    expect(warn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run src/model/dev-warn.test.ts`
Expected: FAIL — `Failed to resolve import "./dev-warn"` (the module does not exist yet).

- [ ] **Step 7: Create `src/model/dev-warn.ts`**

```ts
/**
 * Minimal ambient declaration for `process` so the NODE_ENV check type-checks
 * without depending on `@types/node`. A consumer's bundler replaces
 * `process.env.NODE_ENV` with a string literal, so this reference never
 * survives into a production bundle.
 */
declare const process: { env: { NODE_ENV?: string } } | undefined;

/**
 * Emits a development-mode warning, prefixed with `[strata]`.
 *
 * No-op in production builds: a consumer's bundler replaces
 * `process.env.NODE_ENV` with `"production"`, letting the `console.warn`
 * branch be tree-shaken away. Used to flag misconfiguration and messy data
 * (duplicate ids, orphan rows, cycles) without ever crashing the grid.
 */
export function devWarn(message: string): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    return;
  }
  console.warn(`[strata] ${message}`);
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run src/model/dev-warn.test.ts`
Expected: PASS — 2 tests passing.

- [ ] **Step 9: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — 30 tests, 8 files (Plan 2's 28 plus the 2 new `devWarn` tests).

- [ ] **Step 10: Commit `devWarn`**

```bash
git add src/model/dev-warn.ts src/model/dev-warn.test.ts
git commit -m "feat: add devWarn development-warning helper"
```

---

## Task 2: Tree-data normalization — `normalizeTreeData`

The pure core of tree mode. Strata accepts two data shapes; this function reduces both to one — a list of root rows plus a `getSubRows` accessor — which TanStack Table consumes directly. Flat data is assembled into a tree, and messy ERP data is repaired without ever crashing or looping: duplicate ids (last wins), orphan rows (promoted to roots), and cycles (the closing edge is dropped). Each repair emits a `devWarn`.

**Files:**
- Create: `src/model/normalize-tree-data.ts`
- Test: `src/model/normalize-tree-data.test.ts`

- [ ] **Step 1: Write the failing test — `src/model/normalize-tree-data.test.ts`**

```ts
import { normalizeTreeData } from './normalize-tree-data';

interface Nested {
  id: string;
  name: string;
  children?: Nested[];
}

interface Flat {
  id: string;
  name: string;
  parentId: string | null;
}

describe('normalizeTreeData — nested data', () => {
  it('uses getChildren directly as getSubRows', () => {
    const rows: Nested[] = [
      { id: 'a', name: 'A', children: [{ id: 'a1', name: 'A1' }] },
    ];
    const result = normalizeTreeData(rows, {
      getRowId: (r) => r.id,
      getChildren: (r) => r.children,
    });
    expect(result.rootRows).toBe(rows);
    expect(result.getSubRows(rows[0])).toEqual([{ id: 'a1', name: 'A1' }]);
  });

  it('warns and prefers getChildren when both accessors are given', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rows: Nested[] = [{ id: 'a', name: 'A' }];
    const result = normalizeTreeData(rows, {
      getRowId: (r) => r.id,
      getChildren: (r) => r.children,
      getParentId: () => null,
    });
    expect(result.rootRows).toBe(rows);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('warns and treats every row as a root when neither accessor is given', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rows: Nested[] = [{ id: 'a', name: 'A' }];
    const result = normalizeTreeData(rows, { getRowId: (r) => r.id });
    expect(result.rootRows).toBe(rows);
    expect(result.getSubRows(rows[0])).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('normalizeTreeData — flat data', () => {
  function build(rows: Flat[]) {
    return normalizeTreeData(rows, {
      getRowId: (r) => r.id,
      getParentId: (r) => r.parentId,
    });
  }

  it('assembles parent-pointer rows into roots and children', () => {
    const rows: Flat[] = [
      { id: 'root', name: 'Root', parentId: null },
      { id: 'c1', name: 'Child 1', parentId: 'root' },
      { id: 'c2', name: 'Child 2', parentId: 'root' },
    ];
    const result = build(rows);
    expect(result.rootRows.map((r) => r.id)).toEqual(['root']);
    expect(result.getSubRows(rows[0])?.map((r) => r.id)).toEqual(['c1', 'c2']);
  });

  it('returns undefined subrows for a leaf', () => {
    const rows: Flat[] = [{ id: 'root', name: 'Root', parentId: null }];
    const result = build(rows);
    expect(result.getSubRows(rows[0])).toBeUndefined();
  });

  it('preserves input order among roots', () => {
    const rows: Flat[] = [
      { id: 'r2', name: 'R2', parentId: null },
      { id: 'r1', name: 'R1', parentId: null },
    ];
    const result = build(rows);
    expect(result.rootRows.map((r) => r.id)).toEqual(['r2', 'r1']);
  });

  it('promotes orphan rows to roots and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rows: Flat[] = [
      { id: 'root', name: 'Root', parentId: null },
      { id: 'lost', name: 'Lost', parentId: 'missing' },
    ];
    const result = build(rows);
    expect(result.rootRows.map((r) => r.id)).toEqual(['root', 'lost']);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('keeps the last row when ids are duplicated and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rows: Flat[] = [
      { id: 'dup', name: 'First', parentId: null },
      { id: 'dup', name: 'Second', parentId: null },
    ];
    const result = build(rows);
    expect(result.rootRows).toHaveLength(1);
    expect(result.rootRows[0].name).toBe('Second');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('breaks cycles instead of looping forever', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rows: Flat[] = [
      { id: 'x', name: 'X', parentId: 'y' },
      { id: 'y', name: 'Y', parentId: 'x' },
    ];
    const result = build(rows);
    // The cycle is broken: at least one node becomes a root, and every node
    // is still reachable exactly once by walking down from the roots.
    expect(result.rootRows.length).toBeGreaterThan(0);
    const seen = new Set<string>();
    const collect = (list: Flat[]): void => {
      for (const row of list) {
        seen.add(row.id);
        const kids = result.getSubRows(row);
        if (kids) collect(kids);
      }
    };
    collect(result.rootRows);
    expect(seen).toEqual(new Set(['x', 'y']));
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('handles a self-referencing row', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rows: Flat[] = [{ id: 's', name: 'Self', parentId: 's' }];
    const result = build(rows);
    expect(result.rootRows.map((r) => r.id)).toEqual(['s']);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/model/normalize-tree-data.test.ts`
Expected: FAIL — `Failed to resolve import "./normalize-tree-data"` (the module does not exist yet).

- [ ] **Step 3: Create `src/model/normalize-tree-data.ts`**

```ts
import type { TreeDataConfig } from './types';
import { devWarn } from './dev-warn';

/**
 * The result of normalizing tree data: a flat-or-nested input reduced to the
 * single shape TanStack Table consumes — the root rows plus a `getSubRows`
 * accessor.
 */
export interface NormalizedTree<TRow> {
  /** The top-level rows (depth 0). */
  rootRows: TRow[];
  /** Returns a row's child rows, or `undefined` for a leaf. */
  getSubRows: (row: TRow) => TRow[] | undefined;
}

/**
 * Reduces Strata's two accepted tree-data shapes to one.
 *
 * - Nested data (`getChildren`) is used directly.
 * - Flat data (`getParentId`) is assembled into a tree by `buildTreeFromFlat`,
 *   which repairs duplicate ids, orphan rows, and cycles.
 *
 * `getChildren` takes precedence if both accessors are supplied.
 */
export function normalizeTreeData<TRow>(
  rows: TRow[],
  config: TreeDataConfig<TRow>,
): NormalizedTree<TRow> {
  const { getChildren, getParentId } = config;

  if (getChildren) {
    if (getParentId) {
      devWarn(
        'treeData has both getChildren and getParentId; using getChildren.',
      );
    }
    return { rootRows: rows, getSubRows: getChildren };
  }

  if (getParentId) {
    return buildTreeFromFlat(rows, config.getRowId, getParentId);
  }

  devWarn(
    'treeData has neither getChildren nor getParentId; treating all rows as roots.',
  );
  return { rootRows: rows, getSubRows: () => undefined };
}

/**
 * Assembles flat, parent-pointer rows into a tree.
 *
 * Repairs messy ERP data without ever crashing or looping:
 * - duplicate ids — the last occurrence wins;
 * - orphan rows (parent id not present) — promoted to roots;
 * - cycles (a row that is its own ancestor) — the closing edge is dropped.
 *
 * Each repair emits a development-mode warning. Root and sibling order
 * follows input order, so the result is deterministic.
 */
function buildTreeFromFlat<TRow>(
  rows: TRow[],
  getRowId: (row: TRow) => string,
  getParentId: (row: TRow) => string | null | undefined,
): NormalizedTree<TRow> {
  // 1. Index rows by id; last occurrence wins on duplicates.
  const byId = new Map<string, TRow>();
  for (const row of rows) {
    const id = getRowId(row);
    if (byId.has(id)) {
      devWarn(`Duplicate row id "${id}"; the last occurrence wins.`);
    }
    byId.set(id, row);
  }
  const uniqueRows = [...byId.values()];

  // 2. Resolve each row's effective parent, promoting orphans to roots.
  const effectiveParent = new Map<string, string | null>();
  for (const row of uniqueRows) {
    const id = getRowId(row);
    const parentId = getParentId(row);
    if (parentId == null) {
      effectiveParent.set(id, null);
    } else if (!byId.has(parentId)) {
      devWarn(
        `Row "${id}" references missing parent "${parentId}"; treating it as a root.`,
      );
      effectiveParent.set(id, null);
    } else {
      effectiveParent.set(id, parentId);
    }
  }

  // 3. Break cycles: walk each row's ancestor chain; if it revisits a node,
  //    drop that node's parent edge so the chain terminates.
  for (const row of uniqueRows) {
    const seen = new Set<string>();
    let current: string | null | undefined = getRowId(row);
    while (current != null) {
      if (seen.has(current)) {
        devWarn(
          `Cycle detected in tree data at row "${current}"; treating it as a root.`,
        );
        effectiveParent.set(current, null);
        break;
      }
      seen.add(current);
      current = effectiveParent.get(current) ?? null;
    }
  }

  // 4. Build the children index and the root list, preserving input order.
  const childrenById = new Map<string, TRow[]>();
  const rootRows: TRow[] = [];
  for (const row of uniqueRows) {
    const parentId = effectiveParent.get(getRowId(row)) ?? null;
    if (parentId == null) {
      rootRows.push(row);
    } else {
      const siblings = childrenById.get(parentId);
      if (siblings) {
        siblings.push(row);
      } else {
        childrenById.set(parentId, [row]);
      }
    }
  }

  return {
    rootRows,
    getSubRows: (row) => childrenById.get(getRowId(row)),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/model/normalize-tree-data.test.ts`
Expected: PASS — 10 tests passing.

- [ ] **Step 5: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — 40 tests, 9 files.

- [ ] **Step 6: Commit**

```bash
git add src/model/normalize-tree-data.ts src/model/normalize-tree-data.test.ts
git commit -m "feat: add tree-data normalization with cycle and orphan repair"
```

---

## Task 3: Resolve the tree column — `resolveTreeColumnId`

A pure helper that picks which column renders the hierarchy: the one flagged `isTreeColumn`, or — per the spec's "no tree column designated" edge case — the first column, with a development warning.

**Files:**
- Create: `src/model/resolve-tree-column-id.ts`
- Test: `src/model/resolve-tree-column-id.test.ts`

- [ ] **Step 1: Write the failing test — `src/model/resolve-tree-column-id.test.ts`**

```ts
import { resolveTreeColumnId } from './resolve-tree-column-id';
import type { ColumnDef } from './types';

interface Row {
  a: string;
  b: string;
}

describe('resolveTreeColumnId', () => {
  it('returns the id of the column flagged isTreeColumn', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'A' },
      { id: 'b', header: 'B', isTreeColumn: true },
    ];
    expect(resolveTreeColumnId(columns)).toBe('b');
  });

  it('falls back to the first column and warns when none is flagged', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'A' },
      { id: 'b', header: 'B' },
    ];
    expect(resolveTreeColumnId(columns)).toBe('a');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/model/resolve-tree-column-id.test.ts`
Expected: FAIL — `Failed to resolve import "./resolve-tree-column-id"` (the module does not exist yet).

- [ ] **Step 3: Create `src/model/resolve-tree-column-id.ts`**

```ts
import type { ColumnDef } from './types';
import { devWarn } from './dev-warn';

/**
 * Picks which column renders the tree hierarchy.
 *
 * Returns the id of the column flagged `isTreeColumn`. If no column is
 * flagged, falls back to the first column and emits a development warning.
 * Returns an empty string if there are no columns at all.
 */
export function resolveTreeColumnId<TRow>(columns: ColumnDef<TRow>[]): string {
  const designated = columns.find((column) => column.isTreeColumn);
  if (designated) {
    return designated.id;
  }
  if (columns.length === 0) {
    devWarn('Tree mode is on but the grid has no columns.');
    return '';
  }
  devWarn(
    'No column has isTreeColumn: true; using the first column for the tree.',
  );
  return columns[0].id;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/model/resolve-tree-column-id.test.ts`
Expected: PASS — 2 tests passing.

- [ ] **Step 5: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — 42 tests, 10 files.

- [ ] **Step 6: Commit**

```bash
git add src/model/resolve-tree-column-id.ts src/model/resolve-tree-column-id.test.ts
git commit -m "feat: add resolveTreeColumnId to pick the hierarchy column"
```

---

## Task 4: Wire tree expansion into `useGridTable`

`useGridTable` gains three optional inputs — `getSubRows`, `getRowId`, and `defaultExpanded` — and always installs TanStack Table's expanded row model. With no `getSubRows` the expanded model is identical to the core model, so flat grids are unaffected. With `getSubRows`, `table.getRowModel()` returns only the currently-visible (expanded) rows, flattened — exactly what `BodyViewport` already consumes.

**Files:**
- Modify: `src/model/use-grid-table.ts`
- Modify: `src/model/use-grid-table.test.ts`

- [ ] **Step 1: Replace `src/model/use-grid-table.test.ts` entirely**

```ts
import { renderHook } from '@testing-library/react';
import { useGridTable } from './use-grid-table';
import type { ColumnDef } from './types';

interface Material {
  id: string;
  name: string;
  qty: number;
}

const data: Material[] = [
  { id: 'M-1', name: 'Bolt', qty: 12 },
  { id: 'M-2', name: 'Nut', qty: 8 },
];

const columns: ColumnDef<Material>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'qty', header: 'Qty', accessor: 'qty' },
];

describe('useGridTable', () => {
  it('builds a table with one row per data item', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    expect(result.current.getRowModel().rows).toHaveLength(2);
  });

  it('builds a table with one column per column def', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    expect(result.current.getAllColumns()).toHaveLength(2);
  });

  it('exposes cell values through the column accessors', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    const firstRow = result.current.getRowModel().rows[0];
    const values = firstRow.getVisibleCells().map((cell) => cell.getValue());
    expect(values).toEqual(['Bolt', 12]);
  });

  it('carries the Strata column on each column meta', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    const meta = result.current.getAllColumns()[0].columnDef.meta;
    expect(meta?.strataColumn.id).toBe('name');
  });

  it('applies the default width to columns without an explicit width', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    expect(result.current.getAllColumns()[0].getSize()).toBe(160);
  });
});

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

const treeRows: TreeNode[] = [
  {
    id: 'a',
    name: 'A',
    children: [
      { id: 'a1', name: 'A1' },
      { id: 'a2', name: 'A2' },
    ],
  },
];

const treeColumns: ColumnDef<TreeNode>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
];

describe('useGridTable — tree mode', () => {
  it('shows only root rows when collapsed', () => {
    const { result } = renderHook(() =>
      useGridTable({
        data: treeRows,
        columns: treeColumns,
        getSubRows: (row) => row.children,
        getRowId: (row) => row.id,
      }),
    );
    expect(result.current.getRowModel().rows).toHaveLength(1);
  });

  it('marks a row with children as expandable', () => {
    const { result } = renderHook(() =>
      useGridTable({
        data: treeRows,
        columns: treeColumns,
        getSubRows: (row) => row.children,
        getRowId: (row) => row.id,
      }),
    );
    expect(result.current.getRowModel().rows[0].getCanExpand()).toBe(true);
  });

  it('includes descendant rows when defaultExpanded is set', () => {
    const { result } = renderHook(() =>
      useGridTable({
        data: treeRows,
        columns: treeColumns,
        getSubRows: (row) => row.children,
        getRowId: (row) => row.id,
        defaultExpanded: true,
      }),
    );
    // 1 root + 2 children
    expect(result.current.getRowModel().rows).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run the test to verify the tree-mode tests fail**

Run: `npx vitest run src/model/use-grid-table.test.ts`
Expected: FAIL — the 3 new `tree mode` tests fail. `getSubRows`/`getRowId`/`defaultExpanded` are not yet accepted, so children never appear: "shows only root rows" still passes by coincidence, "marks a row with children as expandable" fails (`getCanExpand()` is `false`), and "includes descendant rows" fails (still 1 row). The original 5 tests pass.

- [ ] **Step 3: Replace `src/model/use-grid-table.ts` entirely**

```ts
import { useMemo } from 'react';
import {
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ColumnDef as TanstackColumnDef,
  type Row,
  type Table,
} from '@tanstack/react-table';
import type { ColumnDef } from './types';
import { readValue } from './read-value';
import { DEFAULT_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from './constants';

export interface UseGridTableOptions<TRow> {
  /** The rows to display. In tree mode, the root rows. */
  data: TRow[];
  /** The column definitions. */
  columns: ColumnDef<TRow>[];
  /**
   * Tree mode: returns a row's child rows, or `undefined` for a leaf.
   * Omit for a flat grid.
   */
  getSubRows?: (row: TRow) => TRow[] | undefined;
  /** Tree mode: returns a stable, unique id for a row. */
  getRowId?: (row: TRow, index: number, parent?: Row<TRow>) => string;
  /** Tree mode: when true, every row starts expanded. Defaults to false. */
  defaultExpanded?: boolean;
}

/**
 * Builds a TanStack Table instance from Strata column definitions.
 *
 * Each Strata column is carried on its TanStack column via `meta.strataColumn`.
 * The expanded row model is always installed: with no `getSubRows` it is
 * identical to the core model (flat grids are unaffected); with `getSubRows`
 * it flattens only the currently-expanded rows. Expansion state is managed
 * internally by TanStack Table and seeded by `defaultExpanded`.
 */
export function useGridTable<TRow>(
  options: UseGridTableOptions<TRow>,
): Table<TRow> {
  const { data, columns, getSubRows, getRowId, defaultExpanded } = options;

  const tanstackColumns = useMemo<TanstackColumnDef<TRow>[]>(
    () =>
      columns.map((column) => ({
        id: column.id,
        accessorFn: (row: TRow) => readValue(column, row),
        size: column.width ?? DEFAULT_COLUMN_WIDTH,
        minSize: column.minWidth ?? MIN_COLUMN_WIDTH,
        meta: { strataColumn: column },
      })),
    [columns],
  );

  return useReactTable<TRow>({
    data,
    columns: tanstackColumns,
    getRowId,
    getSubRows,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    initialState: { expanded: defaultExpanded ? true : {} },
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/model/use-grid-table.test.ts`
Expected: PASS — 8 tests passing.

- [ ] **Step 5: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — 45 tests, 10 files. The flat-grid tests are unaffected: with no `getSubRows`, the expanded row model equals the core model.

- [ ] **Step 6: Commit**

```bash
git add src/model/use-grid-table.ts src/model/use-grid-table.test.ts
git commit -m "feat: wire tree expansion into useGridTable"
```

---

## Task 5: Extract shared cell content — `renderCellContent`

`TreeCell` (next task) must render cell content identically to `DataCell` — same custom-renderer delegation, same null handling. Extract that logic into one shared function so the two cell components cannot drift apart. This is a pure refactor of existing behavior plus its first direct unit test.

**Files:**
- Create: `src/components/render-cell-content.ts`
- Create: `src/components/render-cell-content.test.ts`
- Modify: `src/components/DataCell.tsx`

- [ ] **Step 1: Write the failing test — `src/components/render-cell-content.test.ts`**

```ts
import { renderHook } from '@testing-library/react';
import { renderCellContent } from './render-cell-content';
import { useGridTable } from '../model/use-grid-table';
import type { ColumnDef } from '../model/types';

interface Part {
  id: string;
  name: string;
}

const data: Part[] = [{ id: '1', name: 'Bolt' }];

const columns: ColumnDef<Part>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'tag', header: 'Tag', cell: ({ row }) => `${row.name}!` },
];

describe('renderCellContent', () => {
  it('stringifies the accessor value for a plain column', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    const cell = result.current.getRowModel().rows[0].getVisibleCells()[0];
    expect(renderCellContent(cell)).toBe('Bolt');
  });

  it('delegates to a custom cell renderer when present', () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    const cell = result.current.getRowModel().rows[0].getVisibleCells()[1];
    expect(renderCellContent(cell)).toBe('Bolt!');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/render-cell-content.test.ts`
Expected: FAIL — `Failed to resolve import "./render-cell-content"` (the module does not exist yet).

- [ ] **Step 3: Create `src/components/render-cell-content.ts`**

```ts
import type { Cell } from '@tanstack/react-table';
import type { ReactNode } from 'react';

/**
 * Produces the display content for a body cell: the column's custom renderer
 * if it defines one, otherwise the stringified accessor value (`null` and
 * `undefined` render as empty).
 *
 * Shared by `DataCell` and `TreeCell` so cell content renders identically in
 * ordinary and tree-column cells.
 */
export function renderCellContent<TRow>(cell: Cell<TRow, unknown>): ReactNode {
  const strataColumn = cell.column.columnDef.meta!.strataColumn;
  const value = cell.getValue();
  if (strataColumn.cell) {
    return strataColumn.cell({
      row: cell.row.original,
      value,
      column: strataColumn,
      rowIndex: cell.row.index,
    });
  }
  return value == null ? '' : String(value);
}
```

- [ ] **Step 4: Replace `src/components/DataCell.tsx` entirely**

```tsx
import type { Cell } from '@tanstack/react-table';
import { renderCellContent } from './render-cell-content';

export interface DataCellProps<TRow> {
  /** The TanStack cell to render. */
  cell: Cell<TRow, unknown>;
}

/** Renders a single ordinary body cell, delegating content rendering. */
export function DataCell<TRow>({ cell }: DataCellProps<TRow>) {
  const width = cell.column.getSize();
  return (
    <div className="strata-cell" role="gridcell" style={{ width }}>
      {renderCellContent(cell)}
    </div>
  );
}
```

- [ ] **Step 5: Run the new test to verify it passes**

Run: `npx vitest run src/components/render-cell-content.test.ts`
Expected: PASS — 2 tests passing.

- [ ] **Step 6: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — 47 tests, 11 files. The existing `DataGrid` cell tests confirm the `DataCell` refactor preserves behavior.

- [ ] **Step 7: Commit**

```bash
git add src/components/render-cell-content.ts src/components/render-cell-content.test.ts src/components/DataCell.tsx
git commit -m "refactor: extract shared renderCellContent helper"
```

---

## Task 6: Tree rendering — `TreeCell` and grid wiring

The integration task. A new `TreeCell` renders the tree column with depth indentation and an expand/collapse control. `GridRow` routes the tree column's cell to `TreeCell` and adds `aria-level`/`aria-expanded`. `treeColumnId` is threaded `DataGrid → GridRoot → BodyViewport → GridRow`, and `GridRoot` switches the grid's ARIA role to `treegrid` in tree mode. `DataGrid` gains the `treeData` and `defaultExpanded` props and wires normalization into the table.

**Files:**
- Create: `src/components/TreeCell.tsx`
- Create: `src/components/DataGrid.tree.test.tsx`
- Modify: `src/components/GridRow.tsx`
- Modify: `src/components/BodyViewport.tsx`
- Modify: `src/components/GridRoot.tsx`
- Modify: `src/components/DataGrid.tsx`

- [ ] **Step 1: Write the failing test — `src/components/DataGrid.tree.test.tsx`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import { TREE_INDENT_WIDTH } from '../model/constants';
import type { ColumnDef } from '../model/types';

interface BomNode {
  id: string;
  name: string;
  children?: BomNode[];
}

const nestedBom: BomNode[] = [
  {
    id: 'A',
    name: 'Assembly A',
    children: [
      { id: 'A1', name: 'Part A1' },
      { id: 'A2', name: 'Part A2' },
    ],
  },
  {
    id: 'B',
    name: 'Assembly B',
    children: [{ id: 'B1', name: 'Part B1' }],
  },
];

const columns: ColumnDef<BomNode>[] = [
  { id: 'name', header: 'Name', accessor: 'name', isTreeColumn: true },
];

const nestedTree = {
  getRowId: (r: BomNode) => r.id,
  getChildren: (r: BomNode) => r.children,
};

function indentWidth(label: string): number {
  const cell = screen.getByText(label).closest('.strata-tree-cell');
  const indent = cell?.querySelector('.strata-tree-indent') as HTMLElement;
  return Number.parseInt(indent.style.width || '0', 10);
}

describe('DataGrid — tree data', () => {
  it('renders with the treegrid role in tree mode', () => {
    const { container } = render(
      <DataGrid data={nestedBom} columns={columns} treeData={nestedTree} />,
    );
    expect(container.querySelector('[role="treegrid"]')).not.toBeNull();
  });

  it('shows only root rows when collapsed by default', () => {
    render(<DataGrid data={nestedBom} columns={columns} treeData={nestedTree} />);
    expect(screen.getByText('Assembly A')).toBeInTheDocument();
    expect(screen.getByText('Assembly B')).toBeInTheDocument();
    expect(screen.queryByText('Part A1')).not.toBeInTheDocument();
  });

  it('reveals child rows when a parent is expanded', () => {
    render(<DataGrid data={nestedBom} columns={columns} treeData={nestedTree} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Expand row' })[0]);
    expect(screen.getByText('Part A1')).toBeInTheDocument();
    expect(screen.getByText('Part A2')).toBeInTheDocument();
  });

  it('hides child rows again when a parent is collapsed', () => {
    render(<DataGrid data={nestedBom} columns={columns} treeData={nestedTree} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Expand row' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse row' }));
    expect(screen.queryByText('Part A1')).not.toBeInTheDocument();
  });

  it('renders every row when defaultExpanded is set', () => {
    render(
      <DataGrid
        data={nestedBom}
        columns={columns}
        treeData={nestedTree}
        defaultExpanded
      />,
    );
    expect(screen.getByText('Part A1')).toBeInTheDocument();
    expect(screen.getByText('Part B1')).toBeInTheDocument();
  });

  it('sets aria-level on rows by depth', () => {
    render(
      <DataGrid
        data={nestedBom}
        columns={columns}
        treeData={nestedTree}
        defaultExpanded
      />,
    );
    const rootRow = screen.getByText('Assembly A').closest('[role="row"]');
    const childRow = screen.getByText('Part A1').closest('[role="row"]');
    expect(rootRow).toHaveAttribute('aria-level', '1');
    expect(childRow).toHaveAttribute('aria-level', '2');
  });

  it('marks an expandable row with aria-expanded', () => {
    render(<DataGrid data={nestedBom} columns={columns} treeData={nestedTree} />);
    const rootRow = screen.getByText('Assembly A').closest('[role="row"]');
    expect(rootRow).toHaveAttribute('aria-expanded', 'false');
  });

  it('indents child rows deeper than their parent', () => {
    render(
      <DataGrid
        data={nestedBom}
        columns={columns}
        treeData={nestedTree}
        defaultExpanded
      />,
    );
    expect(indentWidth('Assembly A')).toBe(0);
    expect(indentWidth('Part A1')).toBe(TREE_INDENT_WIDTH);
  });

  it('does not render an expand control for leaf rows', () => {
    render(
      <DataGrid
        data={nestedBom}
        columns={columns}
        treeData={nestedTree}
        defaultExpanded
      />,
    );
    // 2 assemblies expand; the 3 leaf parts have no control.
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('builds the tree from flat parent-pointer data', () => {
    interface FlatRow {
      id: string;
      name: string;
      parentId: string | null;
    }
    const flat: FlatRow[] = [
      { id: 'root', name: 'Root', parentId: null },
      { id: 'child', name: 'Child', parentId: 'root' },
    ];
    const flatColumns: ColumnDef<FlatRow>[] = [
      { id: 'name', header: 'Name', accessor: 'name', isTreeColumn: true },
    ];
    render(
      <DataGrid
        data={flat}
        columns={flatColumns}
        treeData={{ getRowId: (r) => r.id, getParentId: (r) => r.parentId }}
        defaultExpanded
      />,
    );
    expect(screen.getByText('Root')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/DataGrid.tree.test.tsx`
Expected: FAIL — `DataGrid` does not yet accept a `treeData` prop, so no tree renders (no `treegrid` role, no expand controls, children never hidden/shown).

- [ ] **Step 3: Create `src/components/TreeCell.tsx`**

```tsx
import type { Cell } from '@tanstack/react-table';
import { TREE_INDENT_WIDTH } from '../model/constants';
import { renderCellContent } from './render-cell-content';

export interface TreeCellProps<TRow> {
  /** The TanStack cell to render. */
  cell: Cell<TRow, unknown>;
}

/**
 * Renders the tree column's cell: depth indentation, an expand/collapse
 * control for rows that have children, and the cell content. Kept separate
 * from `DataCell` so hierarchy chrome never leaks into ordinary cells.
 */
export function TreeCell<TRow>({ cell }: TreeCellProps<TRow>) {
  const { row } = cell;
  const width = cell.column.getSize();
  const canExpand = row.getCanExpand();
  const expanded = row.getIsExpanded();

  return (
    <div
      className="strata-cell strata-tree-cell"
      role="gridcell"
      style={{ width }}
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

- [ ] **Step 4: Replace `src/components/GridRow.tsx` entirely**

```tsx
import type { CSSProperties } from 'react';
import type { Row } from '@tanstack/react-table';
import { DataCell } from './DataCell';
import { TreeCell } from './TreeCell';

export interface GridRowProps<TRow> {
  /** The TanStack row to render. */
  row: Row<TRow>;
  /** Positioning style applied by the row virtualizer. */
  style?: CSSProperties;
  /** Id of the tree column. Set only in tree mode. */
  treeColumnId?: string;
}

/** Renders one body row as a horizontal strip of cells. */
export function GridRow<TRow>({ row, style, treeColumnId }: GridRowProps<TRow>) {
  const isTree = treeColumnId !== undefined;
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
      {row.getVisibleCells().map((cell) =>
        cell.column.id === treeColumnId ? (
          <TreeCell key={cell.id} cell={cell} />
        ) : (
          <DataCell key={cell.id} cell={cell} />
        ),
      )}
    </div>
  );
}
```

- [ ] **Step 5: Replace `src/components/BodyViewport.tsx` entirely**

```tsx
import { useRef } from 'react';
import type { Table } from '@tanstack/react-table';
import { GridRow } from './GridRow';
import { useRowVirtualizer } from '../virtual/use-row-virtualizer';

export interface BodyViewportProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
  /** Height of the scrollable body area in pixels. */
  height: number;
  /** Id of the tree column. Set only in tree mode. */
  treeColumnId?: string;
}

/** Renders the grid body as a vertically virtualized scroll area. */
export function BodyViewport<TRow>({
  table,
  height,
  treeColumnId,
}: BodyViewportProps<TRow>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const virtualizer = useRowVirtualizer({ scrollRef, count: rows.length });

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

  return (
    <div ref={scrollRef} className="strata-body" role="rowgroup" style={{ height }}>
      <div
        className="strata-body-sizer"
        role="presentation"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <GridRow
            key={virtualRow.key}
            row={rows[virtualRow.index]}
            treeColumnId={treeColumnId}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Replace `src/components/GridRoot.tsx` entirely**

```tsx
import type { Table } from '@tanstack/react-table';
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
}

/** The grid layout shell. */
export function GridRoot<TRow>({
  table,
  height,
  treeColumnId,
}: GridRootProps<TRow>) {
  return (
    <div
      className="strata-grid"
      role={treeColumnId === undefined ? 'grid' : 'treegrid'}
    >
      <HeaderArea table={table} />
      <BodyViewport table={table} height={height} treeColumnId={treeColumnId} />
      <GridFooter rowCount={table.getRowModel().rows.length} />
    </div>
  );
}
```

- [ ] **Step 7: Replace `src/components/DataGrid.tsx` entirely**

```tsx
import { useMemo } from 'react';
import type { ColumnDef, TreeDataConfig } from '../model/types';
import { DEFAULT_GRID_HEIGHT } from '../model/constants';
import { useGridTable } from '../model/use-grid-table';
import { normalizeTreeData } from '../model/normalize-tree-data';
import { resolveTreeColumnId } from '../model/resolve-tree-column-id';
import { InMemoryDataSource } from '../data/in-memory-data-source';
import { GridRoot } from './GridRoot';

export interface DataGridProps<TRow> {
  /** The rows to display. */
  data: TRow[];
  /** The column definitions. */
  columns: ColumnDef<TRow>[];
  /** Height of the scrollable body area in pixels. Defaults to 400. */
  height?: number;
  /**
   * Turns on tree (hierarchical / BOM) mode. Provide either `getChildren`
   * (nested data) or `getParentId` (flat data).
   */
  treeData?: TreeDataConfig<TRow>;
  /** Tree mode: when true, every row starts expanded. Defaults to false. */
  defaultExpanded?: boolean;
}

/** The public Strata grid component. */
export function DataGrid<TRow>({
  data,
  columns,
  height = DEFAULT_GRID_HEIGHT,
  treeData,
  defaultExpanded,
}: DataGridProps<TRow>) {
  const dataSource = useMemo(() => new InMemoryDataSource(data), [data]);
  const rows = dataSource.load();

  const tree = useMemo(
    () => (treeData ? normalizeTreeData(rows, treeData) : null),
    [rows, treeData],
  );

  const treeColumnId = useMemo(
    () => (treeData ? resolveTreeColumnId(columns) : undefined),
    [treeData, columns],
  );

  const table = useGridTable({
    data: tree ? tree.rootRows : rows,
    columns,
    getSubRows: tree?.getSubRows,
    getRowId: treeData ? (row: TRow) => treeData.getRowId(row) : undefined,
    defaultExpanded,
  });

  return <GridRoot table={table} height={height} treeColumnId={treeColumnId} />;
}
```

- [ ] **Step 8: Run the tree test to verify it passes**

Run: `npx vitest run src/components/DataGrid.tree.test.tsx`
Expected: PASS — 10 tests passing.

- [ ] **Step 9: Run the full suite to verify no regression**

Run: `npm test`
Expected: PASS — 57 tests, 12 files. Flat-grid tests are unaffected: `treeColumnId` is `undefined`, so the grid keeps `role="grid"`, every cell stays a `DataCell`, and no ARIA tree attributes are added.

- [ ] **Step 10: Verify it type-checks**

Run: `npm run typecheck`
Expected: completes with no errors.

- [ ] **Step 11: Commit**

```bash
git add src/components/TreeCell.tsx src/components/DataGrid.tree.test.tsx src/components/GridRow.tsx src/components/BodyViewport.tsx src/components/GridRoot.tsx src/components/DataGrid.tsx
git commit -m "feat: render hierarchical tree data with expand and collapse"
```

---

## Task 7: Tree CSS

Styles for the tree cell: a flex layout holding the depth-indent spacer, the expand/collapse control, and an ellipsis-truncating label.

**Files:**
- Modify: `src/strata.css`

- [ ] **Step 1: Replace `src/strata.css` entirely**

```css
.strata-grid {
  display: flex;
  flex-direction: column;
  border: 1px solid #d1d1d6;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  overflow: hidden;
}

.strata-header {
  display: flex;
  flex-direction: column;
}

.strata-header-row {
  display: flex;
}

.strata-header-cell {
  box-sizing: border-box;
  padding: 6px 10px;
  font-weight: 600;
  background: #f5f5f7;
  border-bottom: 1px solid #d1d1d6;
  border-right: 1px solid #e5e5e7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strata-body {
  overflow-x: hidden;
  overflow-y: auto;
}

.strata-body-sizer {
  position: relative;
  width: 100%;
}

.strata-row {
  display: flex;
}

.strata-cell {
  box-sizing: border-box;
  padding: 6px 10px;
  border-bottom: 1px solid #e5e5e7;
  border-right: 1px solid #e5e5e7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

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
  width: 18px;
  height: 18px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: #6e6e73;
  font-size: 9px;
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

.strata-empty {
  padding: 24px;
  text-align: center;
  color: #86868b;
}

.strata-footer {
  padding: 6px 10px;
  background: #f5f5f7;
  border-top: 1px solid #d1d1d6;
  color: #86868b;
  font-size: 12px;
}
```

The only changes from Plan 2 are the five new `.strata-tree-*` rules. `.strata-tree-cell` overrides the cell to a flex row; `.strata-tree-label` carries the ellipsis truncation (`min-width: 0` lets it shrink inside the flex row).

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: completes with no errors; `dist/strata.css` is regenerated and contains the `.strata-tree-*` rules.

- [ ] **Step 3: Commit**

```bash
git add src/strata.css
git commit -m "style: add tree-cell indentation and toggle styles"
```

---

## Task 8: Public exports, playground BOM demo, final verification

Export the new public type, replace the playground with a multi-level indented BOM that exercises tree mode, and run the full verification pass.

**Files:**
- Modify: `src/index.ts`
- Modify: `playground/App.tsx`

- [ ] **Step 1: Replace `src/index.ts` entirely**

```ts
export { DataGrid } from './components/DataGrid';
export type { DataGridProps } from './components/DataGrid';
export type { ColumnDef, CellContext, TreeDataConfig } from './model/types';
export { InMemoryDataSource } from './data/in-memory-data-source';
export type { DataSource } from './data/data-source';
```

- [ ] **Step 2: Replace `playground/App.tsx` entirely**

```tsx
import { DataGrid, type ColumnDef, type TreeDataConfig } from '../src/index';
import '../src/strata.css';

/**
 * Throwaway dev playground for Strata.
 * The full examples app is Plan 7 in docs/roadmap.md.
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
  { id: 'material', header: 'Material', accessor: 'material', width: 150, isTreeColumn: true },
  { id: 'description', header: 'Description', accessor: 'description', width: 260 },
  { id: 'qty', header: 'Qty', accessor: 'qty', width: 80 },
  { id: 'uom', header: 'UoM', accessor: 'uom', width: 80 },
];

const treeData: TreeDataConfig<BomNode> = {
  getRowId: (r) => r.id,
  getChildren: (r) => r.children,
};

export function App() {
  return (
    <div style={{ padding: 32, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Strata — Plan 3 Playground</h1>
      <p style={{ color: '#86868b', fontSize: 14, margin: '0 0 20px' }}>
        Tree data · multi-level indented bill of materials · expand / collapse
      </p>
      <DataGrid
        data={bom}
        columns={columns}
        treeData={treeData}
        defaultExpanded
        height={520}
      />
    </div>
  );
}
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS — 57 tests, 12 files.

- [ ] **Step 4: Run the type check**

Run: `npm run typecheck`
Expected: completes with no errors.

- [ ] **Step 5: Run the build**

Run: `npm run build`
Expected: completes with no errors; `dist/` contains `index.js`, `index.cjs`, `index.d.ts`, `index.d.cts`, `strata.css`. `index.d.ts` exports `TreeDataConfig`.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts playground/App.tsx
git commit -m "feat: export TreeDataConfig and demo a multi-level BOM"
```

---

## Done — what Plan 3 delivers

`<DataGrid>` becomes a tree/BOM grid the moment a `treeData` prop is supplied. It accepts both data shapes — nested (`getChildren`) and flat SAP-style parent-pointer rows (`getParentId`) — and reduces them to one model, repairing duplicate ids, orphan rows, and cycles with development warnings rather than crashes. The designated `isTreeColumn` renders through `TreeCell` with depth indentation and an expand/collapse control; expansion is uncontrolled (TanStack-managed) and seedable with `defaultExpanded`. In tree mode the grid takes the `treegrid` ARIA role and rows carry `aria-level` and `aria-expanded`. Row virtualization from Plan 2 still applies — only the visible window of expanded rows reaches the DOM. 57 tests pass; the build is clean.

**Documentation:** every new module carries JSDoc describing its responsibility; the design spec (§9.1–9.2) already documents the `treeData` and `isTreeColumn` API surface, so no spec change is needed. The roadmap tracks milestones, not individual plans, and is left unchanged.

**Next:** Plan 4 — Sorting & filtering (multi-column tree-aware sort where children sort within their parent; per-column text and number filters that keep matching nodes' ancestors visible).
