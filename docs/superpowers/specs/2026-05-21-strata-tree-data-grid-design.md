# Strata — Design Spec: M1 · BOM / Tree Data Grid (read-only core)

- **Date:** 2026-05-21
- **Status:** Design — awaiting final review before implementation planning
- **Scope of this document:** Milestone 1 only. M2–M4 are summarized for context and will each get their own spec.

---

## 1. Overview

**Strata** is an open-source (MIT) React data-grid library. Its defining capability
is the **indented multi-level tree grid** — the canonical view for Product
Lifecycle Management (PLM) bills of materials and other hierarchical
enterprise data — delivered free, where every comparable library either
paywalls it or omits it.

This spec covers **Milestone 1 (M1): a read-only BOM / tree data grid**. It is
the minimum lovable product: a fast, accessible, themable tree grid that can be
dropped into an application and already outperforms the common workaround of
"AG Grid Community plus a hand-rolled tree."

The public component is a single `<DataGrid>`. It renders a flat grid by
default and becomes a tree/BOM grid when given hierarchy configuration.

---

## 2. Background & motivation

Existing data grids fail the target use case in one of two ways:

| Library | Gap |
|---|---|
| AG Grid | Tree Data, row grouping, pivoting are **Enterprise (paid)** |
| Syncfusion | Commercial license; heavy |
| MUI X Data Grid | Tree data, grouping are **Pro/Premium (paid)** |
| TanStack Table | Free & MIT, but **headless** — no UI, no virtualization, no styling |
| Glide Data Grid | Free, but **canvas-only** — weak DOM customization & accessibility |
| RevoGrid | Free, but smaller community, fewer enterprise features |

The precise gap: **TanStack Table is free and includes a tree-aware row model,
but you must build the entire UI yourself.** Strata fills exactly that gap — it
*is* that UI. Strata is not a competitor to TanStack Table; it completes it.

### Why not build on AG Grid Community?

AG Grid Community is MIT and could legally be a base, but it is designed to be
*configured*, not *extended*. Its tree data is Enterprise-only, and faking a
tree by flattening rows breaks AG Grid's own sorting and filtering (children
sort above parents). You would reimplement sort/filter anyway, while wedged
inside a grid that resists the change. TanStack Table's expanded/sub-row model
is tree-native — sorting and filtering compose correctly with the hierarchy —
and being headless, it leaves us full control of the DOM.

---

## 3. Goals & non-goals

### Goals (M1)

- A read-only tree/BOM data grid and flat data grid in one `<DataGrid>` component.
- Handle large datasets smoothly via row **and** column virtualization.
- First-class column management for wide SAP-style material tables.
- TypeScript-first, idiomatic React, uncontrolled-by-default API.
- Accessible (ARIA `treegrid`) and themable (CSS custom properties).
- Publishable, installable open-source npm package.

### Non-goals (M1 — deferred to later milestones)

- Cell editing and any data mutation (M2).
- BOM quantity roll-up / aggregation (M2).
- The hierarchy/BOM editor — add/move/delete/drag nodes (M3).
- Server-side / lazy-loading data sources (M4).
- CSV/Excel export, advanced filters, where-used analysis (M4).
- A formal plugin/module registry — Tier 3 extensibility (later milestone).
- Live/streaming data updates (later — via the `DataSource.subscribe` seam).
- Frameworks other than React; canvas rendering.

---

## 4. Milestone roadmap

| Milestone | Title | Summary |
|---|---|---|
| **M1** | **BOM / Tree Data Grid (read-only)** | **This spec.** |
| M2 | Editing & aggregation | Inline cell editing, custom editors, validation; BOM quantity roll-up. |
| M3 | Hierarchy editor | Add / rename / delete nodes, drag-to-reparent, indent/outdent, undo/redo. |
| M4 | Scale & enterprise extras | Server-side / lazy `DataSource`, column-level pinning extras, advanced filters, CSV/Excel export, where-used. |
| Later | Tier 3 plugin system | Formal `registerModules([...])` registry for optional feature modules. |

Each milestone is its own spec → implementation plan → build cycle.

---

## 5. M1 scope

**Base capabilities**

1. Columns, rows, DOM cell rendering.
2. Tree data — hierarchical rows, expand/collapse, indent guides, level display.
3. Row **and** column virtualization.
4. Multi-column, tree-aware sorting.
5. Per-column filtering (text and number filters).
6. Column resize and reorder.
7. Row selection — single / multi / checkbox — with parent→child cascade and
   tri-state (indeterminate) parents.
8. Pluggable `DataSource` interface plus an `InMemoryDataSource` implementation.
9. Theming via CSS custom properties (bundled light and dark themes).
10. Keyboard navigation and ARIA `treegrid` accessibility.

**Domain capabilities (confirmed in scope for M1)**

11. Column pinning / freeze — left and right.
12. Column groups — stacked multi-row headers.
13. Row grouping — group flat rows by one or more column values.

M1 is intentionally **read-only**. Editing (M2) and the hierarchy editor (M3)
are the mutation layer; they bolt cleanly onto a grid that already renders,
sorts, virtualizes, and selects well.

---

## 6. Architecture

### 6.1 Foundation

- **TanStack Table** — column model and row model (filter, group, sort,
  tree-expand). Reused.
- **TanStack Virtual** — row and column windowing math. Reused.
- Both are **bundled dependencies**: users install one package and never
  interact with TanStack directly.

### 6.2 Runtime layers

From the public surface inward:

| Layer | Build / Reuse | Responsibility |
|---|---|---|
| Public API | Build | `<DataGrid>`, `apiRef` (`GridApi`), column-type registry, TypeScript types |
| Component layer | Build | `GridRoot`, header, body, rows, cells, pinning |
| Virtualization integration | Build (glue) | Wire TanStack Virtual to rows + columns + pinned panes |
| TanStack Virtual | Reuse | Row & column windowing |
| TanStack Table | Reuse | Column model; sort / filter / group / expand |
| Data source | Build | `DataSource` interface → `InMemoryDataSource` |

### 6.3 Repo layout — single npm package

```
strata-grid/
├─ src/
│  ├─ data/          DataSource interface + InMemoryDataSource
│  ├─ model/         TanStack Table wiring, column/row defs, types
│  ├─ virtual/       TanStack Virtual integration
│  ├─ components/    GridRoot, Header, ColumnGroups, Body, Row, Cell, Pinning,
│  │                 SelectionColumn, EmptyState
│  ├─ theme/         CSS custom properties, light/dark themes
│  ├─ hooks/         useDataGrid and supporting hooks
│  └─ index.ts       public API barrel
├─ examples/         Vite playground — BOM demo + SAP material-table demo
├─ tests/            unit, component, a11y, e2e
├─ package.json
└─ tsup.config.ts
```

Each `src/` folder has one responsibility and a well-defined interface, so units
can be built and tested independently.

### 6.4 Technology choices

| Concern | Choice |
|---|---|
| Language | TypeScript (strict) |
| Framework | React only — peer dependency, supports 17 / 18 / 19 |
| Bundled deps | `@tanstack/react-table`, `@tanstack/react-virtual` |
| Build | `tsup` → ESM + CJS + `.d.ts` |
| Styling | Plain CSS + CSS custom properties; one CSS import; no runtime CSS-in-JS |
| Package | Single npm package, published as `strata-grid` |
| Tests | Vitest, React Testing Library, axe, Playwright |

---

## 7. Extensibility model

Three tiers; **only Tier 1 ships in M1**.

### Tier 1 — Composition extension points (M1)

Eight seams, extended the React way — by passing components, adapters, and
callbacks:

- **Cell renderer** — any React component per cell.
- **Header renderer** — custom column headers.
- **Column-type registry** — define reusable typed columns once, reference by `type`.
- **Filter component** — custom per-column filters.
- **DataSource adapter** — swap the data backend.
- **Slots** — inject `toolbar`, `empty`, `error`, `loading` UI regions.
- **Event callbacks** — `onRowExpandChange`, `onSelectionChange`, `onRowClick`, etc.
- **Theme** — restyle via CSS custom properties without forking.

### Tier 2 — Engine-level features (free via TanStack)

TanStack Table's `TableFeature` API is available to advanced users for custom
behavioral extensions. Inherited at no build cost.

### Tier 3 — Formal plugin/module system (later milestone)

A `registerModules([...])` registry for optional, tree-shakeable feature modules
(export, charts, SAP connectors). Deferred deliberately: a plugin API is a
public contract that is very hard to change; it must be designed from real
features (M1–M3), not guessed at up front.

---

## 8. Component breakdown

The grid is a **3 × 3 structure**: three horizontal panes
(pinned-left · center · pinned-right) by three vertical bands
(header · body · footer).

- Pinned panes are **always rendered** (never column-virtualized) — this is what
  makes column freezing work.
- The center pane is **row and column virtualized**.
- Vertical scroll is synchronized across all three panes; horizontal scroll
  moves only the center pane.

### Component tree

```
<DataGrid>                 public component
└─ GridRoot                layout shell; owns the TanStack table instance + scroll container
   ├─ Toolbar              renders the toolbar slot
   ├─ HeaderArea           sticky header
   │  ├─ ColumnGroupRow    stacked group headers
   │  └─ ColumnHeaderRow
   │     └─ ColumnHeaderCell   sort · resize · filter · reorder handle
   ├─ BodyViewport         scroll container; drives row + column virtualization
   │  └─ GridRow           one record
   │     ├─ SelectionCell  (CheckboxCell) tri-state checkbox; from SelectionColumn
   │     ├─ TreeCell       indent guides · expand caret · level (tree column only)
   │     └─ DataCell       delegates to the cell renderer
   ├─ EmptyState           shown when no rows; distinguishes "no data" vs
   │                       "no rows match filter"; overridable via slots.empty
   └─ GridFooter           row count · selection count
```

- **`SelectionColumn`** — a special pinned-left column. Header = select-all
  checkbox with indeterminate state; body cells = `CheckboxCell`. In tree mode
  the checkbox is tri-state: a parent is indeterminate when only some
  descendants are selected.
- **`TreeCell` vs `DataCell`** are deliberately separate so hierarchy chrome
  never leaks into ordinary cells.

Each component has one job and is testable in isolation.

---

## 9. Public API

### 9.1 The `<DataGrid>` component

A single component. Tree mode engages automatically when `treeData` is supplied.

```tsx
<DataGrid<MaterialRow>
  data={rows}                       // a plain array — the common case
  columns={columns}

  // TREE MODE — provide this and the grid becomes a BOM/tree grid.
  // Supply getChildren (nested data) OR getParentId (flat data) — both supported.
  treeData={{
    getRowId:    (r) => r.id,
    getChildren: (r) => r.components,    // nested data, OR…
    getParentId: (r) => r.parentId,      // …flat SAP-style data (STPO rows)
  }}

  groupBy={['materialType']}        // row grouping for flat material tables

  selection={{ mode: 'multi', cascade: true }}
  onSelectionChange={(ids) => {}}

  defaultSort={[{ columnId: 'material', dir: 'asc' }]}

  slots={{ toolbar: <BomToolbar/>, empty: <NoMaterials/> }}
  onRowExpandChange={() => {}}
  onRowClick={() => {}}

  apiRef={gridApi}                  // imperative escape hatch
  theme="dark"
/>
```

`getChildren` and `getParentId` are mutually exclusive; supplying both is a
dev-mode warning, with `getChildren` taking precedence.

### 9.2 Column definitions

```ts
interface ColumnDef<TRow> {
  id: string;
  header: string | ReactNode;
  accessor?: keyof TRow | ((row: TRow) => unknown);

  type?: string;                                  // column-type registry preset
  cell?: (ctx: CellContext<TRow>) => ReactNode;   // custom renderer

  width?: number;
  minWidth?: number;
  pin?: 'left' | 'right';
  sortable?: boolean;
  filter?: 'text' | 'number' | FilterComponent | false;
  isTreeColumn?: boolean;                         // which column shows the hierarchy
}

interface ColumnGroup<TRow> {                     // stacked headers
  groupId: string;
  header: string;
  columns: (ColumnDef<TRow> | ColumnGroup<TRow>)[];
}

type AnyColumn<TRow> = ColumnDef<TRow> | ColumnGroup<TRow>;
```

### 9.3 The DataSource seam

```ts
interface DataSource<TRow> {
  /** Returns all rows. M1: synchronous in-memory; later milestones may be async. */
  load(): TRow[] | Promise<TRow[]>;
  /** Optional. Subscribe to external changes — wired in a later milestone. */
  subscribe?(onChange: () => void): () => void;
}
```

- M1 ships `InMemoryDataSource`, created internally from the `data` prop. All
  filtering, sorting, and grouping are client-side via TanStack Table.
- The `dataSource` prop accepts a custom `DataSource`. M4 will add a
  server-side implementation; the interface may gain an optional query argument
  to `load()` then — an additive, non-breaking change.

### 9.4 Imperative API (`apiRef`)

```ts
interface GridApi<TRow> {
  expandAll(): void;
  collapseAll(): void;
  expandRow(id: string, expanded?: boolean): void;
  scrollToRow(id: string): void;
  getSelectedRows(): TRow[];
  setColumnPinned(id: string, pin: 'left' | 'right' | false): void;
  exportState(): GridState;             // save the current view
  importState(state: GridState): void;  // restore a saved view
}
```

### 9.5 API conventions

**Uncontrolled by default, controllable when needed.** Every feature works with
zero configuration (`defaultSort`, internal state). Opt into full control by
passing the value plus its `onChange` handler (e.g. `sort` + `onSortChange`).
This mirrors React's own `<input>` pattern and keeps the simple case simple.

---

## 10. Data flow

A six-stage pipeline plus an interaction loop:

1. **Source** — the `data` array (or a custom `DataSource`), wrapped in
   `InMemoryDataSource`.
2. **Normalize** — flat data (`getParentId`) is assembled into a tree once and
   memoized; nested data (`getChildren`) is used directly. Rebuilt only when
   `data` changes.
3. **Row model** (TanStack Table) — filter → group → sort → expand.
4. **Visible rows** — the derived, ordered, flattened list of eligible rows.
5. **Virtualize** (TanStack Virtual) — windows the visible rows and columns.
6. **Render** — three panes; only on-screen cells reach the DOM.

**Interaction loop:** any user action (sort, expand, filter, select, resize,
reorder) updates table state, which re-runs the pipeline from stage 3; React
re-renders only what changed.

### Correctness properties

- **Tree-aware sorting** — siblings sort within their parent; a child can never
  sort above its own parent.
- **Filtering keeps ancestors** — when a deep node matches a filter, its
  ancestor rows stay visible so the match is reachable.
- **Windowed rendering** — a 100k-row dataset keeps roughly 30 rows in the DOM.

---

## 11. Error handling & edge cases

Messy ERP data must never crash or hang the grid.

| Edge case | Handling |
|---|---|
| Cyclic tree data (node is its own ancestor) | Cycle detection in Normalize; drop back-edge; dev-warn. Never an infinite loop. |
| Orphan rows (`parentId` → missing parent) | Treated as roots; dev-warn lists them. |
| Duplicate row IDs | Deterministic last-wins; dev-warn. |
| Custom cell renderer throws | Cell-level error boundary → error cell; grid keeps working. |
| Null / undefined cell values | Graceful empty render; configurable placeholder. |
| `DataSource.load()` rejects | `slots.error` state with a retry affordance. |
| No tree column designated in tree mode | Dev-warn; fall back to the first column. |
| `expandAll()` on a very large tree | Absorbed by virtualization; only the window renders. |
| Empty dataset / empty filter result | `EmptyState`, distinguishing "no data" from "no match". |

**Dev-mode validation:** column definitions and tree configuration are checked
on mount, emitting actionable `console.warn` messages in development builds;
these checks are stripped from production builds.

---

## 12. Testing strategy

Built **test-first** — the implementation plan sequences each unit as a failing
test followed by its implementation.

| Layer | Tools | Coverage |
|---|---|---|
| Unit (the bulk) | Vitest | Tree normalization, cycle/orphan detection, selection cascade, sort comparators, virtualization window math — all written as pure, DOM-decoupled functions. |
| Component | Vitest + React Testing Library | Expand/collapse, sorting, filtering, tri-state selection, resize/reorder/pin, grouping, empty & error states. |
| Accessibility | RTL + axe | ARIA `treegrid` roles, `aria-expanded` / `aria-level` / `aria-selected`, keyboard navigation. |
| E2E smoke + perf | Playwright | Real-browser scroll and virtualization; a 100k-row render benchmark. |

Virtualization is the hardest thing to test, so the windowing math is
deliberately isolated as pure functions decoupled from DOM measurement and
unit-tested directly; real scroll behavior is covered by the Playwright layer.

---

## 13. Success criteria for M1

M1 is complete when:

1. `<DataGrid>` renders a 100k-row flat dataset and a 50k-node tree with smooth
   (~60fps) scrolling.
2. Tree expand/collapse, multi-column tree-aware sorting, per-column filtering,
   column pinning, resize, reorder, column groups, row grouping, and row
   selection with tri-state cascade all function correctly.
3. The grid is fully keyboard-navigable and passes axe checks with correct
   ARIA `treegrid` semantics.
4. Light and dark themes work, and a consumer can restyle via CSS custom
   properties without forking.
5. The package builds (ESM + CJS + types) and installs and runs in a fresh Vite
   React application.
6. The `examples/` app demonstrates both an indented multi-level BOM and a wide
   SAP material table.
7. All pure logic is unit-tested; all core component behaviors have component
   tests; the Playwright smoke suite passes.

---

## 14. Open items carried forward

- **npm package name** — `strata-grid` is the working name; verify availability
  before first publish (fallback: a scoped name such as `@strata/grid`).
- **M2+ scope** — editing, aggregation, hierarchy editor, and server-side data
  sources are acknowledged here only; each gets its own spec.
