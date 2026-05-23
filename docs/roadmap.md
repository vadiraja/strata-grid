# Strata — Roadmap

Strata is an open-source (MIT) React data-grid library. Its defining capability
is the **indented multi-level tree grid** — the canonical view for PLM bills of
materials and other hierarchical enterprise data — delivered free, where every
comparable library either paywalls it or omits it.

This roadmap is **roadmap-level scope**, not detailed design. Each milestone
gets its own design spec → implementation plan → build cycle.

| Milestone | Title | Status |
|---|---|---|
| **M1** | BOM / Tree Data Grid (read-only core) | Specced — see [`docs/superpowers/specs/2026-05-21-strata-tree-data-grid-design.md`](superpowers/specs/2026-05-21-strata-tree-data-grid-design.md) |
| **M2** | Editing & aggregation | Specced — see [`docs/superpowers/specs/2026-05-22-strata-m2-editing-aggregation-design.md`](superpowers/specs/2026-05-22-strata-m2-editing-aggregation-design.md) |
| **M3** | Hierarchy / BOM editor | Specced — see [`docs/superpowers/specs/2026-05-23-strata-m3-hierarchy-editor-design.md`](superpowers/specs/2026-05-23-strata-m3-hierarchy-editor-design.md) |
| **M4** | Scale & enterprise extras | Implemented and wired into the playground (Pagination, Quick Search, Filter Builder, Export, Where Used, Column Management, Live Updates, flex columns). Spec: [`docs/superpowers/specs/2026-05-23-strata-m4-scale-enterprise-design.md`](superpowers/specs/2026-05-23-strata-m4-scale-enterprise-design.md) |
| **M5** | Theming & visual polish | Implemented (icons, high-contrast themes, density, striping, runtime theme composition, auto theme, transitions, themed scrollbars, print support). Spec: [`docs/superpowers/specs/2026-05-23-strata-m5-theming-design.md`](superpowers/specs/2026-05-23-strata-m5-theming-design.md) |
| M6 | Plugin system | Backlog |
| M7 | i18n, RTL & localization | Backlog |
| **M8** | Documentation & developer experience (partial — docs site, API ref, contributing, publish-prep) | Implemented (Astro Starlight site at `docs-site/`, TypeDoc-generated API reference, 10 guides covering M1–M5, 4-page contributing guide, `CONTRIBUTING.md`, npm publish metadata + publint gate, CI + GitHub Pages deploy workflows). Storybook, playground embeds, cookbook, migration guides, changelog automation deferred. Spec: [`docs/superpowers/specs/2026-05-23-m8-docs-and-npm-prep-design.md`](superpowers/specs/2026-05-23-m8-docs-and-npm-prep-design.md) |
| M9 | Performance & benchmarks | Backlog |
| M10 | Framework adapters | Backlog |
| **0.2.0** | Server-driven list ergonomics — typed column filters, `onPaginationChange`, `rowActions` | Implemented (driven by ProtoTrack spike feedback, [issue #8](https://github.com/vadiraja/strata-grid/issues/8)). Plan: [`docs/superpowers/plans/2026-05-23-strata-0.2.0-server-driven-list-ergonomics.md`](superpowers/plans/2026-05-23-strata-0.2.0-server-driven-list-ergonomics.md) |

---

## M1 · BOM / Tree Data Grid (read-only core)

The minimum lovable product: a fast, accessible, themable read-only tree/BOM
grid in a single `<DataGrid>` component.

Scope: tree data with expand/collapse and indenting; row + column
virtualization; multi-column tree-aware sorting; per-column filtering; column
resize/reorder; column pinning; column groups (stacked headers); row grouping;
row selection with tri-state cascade; pluggable `DataSource` with an in-memory
implementation; CSS-custom-property theming; ARIA `treegrid` accessibility.

Full detail: see the M1 design spec linked in the table above.

---

## M2 · Editing & aggregation

**Goal:** make the grid writable, and compute roll-ups.

- Inline cell editing — cell and row edit modes
- Built-in editors: text, number, select, date, checkbox
- Custom editor components (extension point)
- Validation — per-column validators with error display
- Commit model and edit events
- **BOM quantity roll-up** — extended quantity (parent qty × component qty)
  cascading down levels
- Column aggregation — sum / avg / min / max / count
- Aggregates displayed on group and parent rows

**Depends on:** M1.

---

## M3 · Hierarchy / BOM editor

**Goal:** reshape the tree — the "structure editor".

- Add / rename / delete nodes
- Drag-to-reparent with drop indicators (distinguishing reparent vs reorder)
- Indent / outdent; sibling reorder
- Move validation — blocks cycles and illegal moves (e.g. moving a parent into
  its own descendant)
- Undo / redo command history
- Cut / copy / paste subtrees
- Change tracking — dirty state, for writing edits back to the ERP/PLM system
- Multi-select move and delete

**Depends on:** M1 (tree) and M2 (editing and undo infrastructure).

---

## M4 · Scale & enterprise extras

**Goal:** big data, real backends, export.

- Server-side / lazy `DataSource` — load-on-expand, paging
- Server-side sort / filter push-down (additive evolution of `DataSource.load`)
- SAP OData `DataSource` adapter
- CSV and Excel (xlsx) export
- Advanced filtering — filter builder, set/checkbox filters, global quick-search
- Where-used / reverse BOM explosion
- Column-management panel; persisted view state
- Live / streaming updates via `DataSource.subscribe`
- **Flex columns** — `ColumnDef.flex` lets one or more columns absorb the
  container's leftover width (similar to AG Grid's `flex`). User-resized
  flex columns convert to fixed widths and stick across re-renders.

**Depends on:** M1 (the `DataSource` seam).

---

## M5 · Theming & visual polish

**Goal:** make Strata look great out of the box and easy to brand.

- Icon system — adopt a default tree-shakeable icon source (recommended:
  Lucide React) behind a Strata-owned `<StrataIcon>` abstraction, with
  consumer overrides for all built-in grid icons
- Icon accessibility contract — every icon-only control has an accessible label;
  decorative icons are hidden from assistive tech; icon semantics are owned by
  the calling component, not the raw SVG
- Grid icon coverage — replace ad hoc glyphs/text affordances for tree expand /
  collapse, sort, filter, search, edit, save, cancel, undo, redo, copy, paste,
  export, refresh, pinning, grouping, column management, warnings, and loading
- Icon theme tokens — size, stroke width, color, disabled color, hover color,
  and compact-density sizing are controlled by theme tokens
- Additional bundled theme presets — high-contrast, compact, comfortable
  (density variants adjusting row height and padding tokens)
- Runtime theme composition — `createTheme({ ...baseLight, accent: '#custom' })`
  helper that generates a scoped CSS class with token overrides
- `prefers-color-scheme` auto-detection — optional `theme="auto"` that follows
  the OS dark/light preference via `matchMedia`
- Smooth theme transitions — opt-in CSS transitions on token changes so
  switching themes doesn't flash
- Row striping (zebra) — `striped` prop toggling alternating row backgrounds
  via tokens
- Density prop — `density: 'compact' | 'comfortable' | 'standard'` adjusting
  padding/font-size tokens without a full theme swap
- Custom scrollbar styling — themed scrollbar track/thumb via CSS for WebKit
  and Firefox
- Print stylesheet — `@media print` rules that collapse virtualization and
  render all rows for clean printouts

**Depends on:** M1 (token foundation from Plan 7).

---

## M6 · Plugin system

**Goal:** a formal extension registry for tree-shakeable feature modules.

- `registerModules([...])` API — consumers opt in to features at grid creation
  time; unused modules are tree-shaken from the bundle
- Module lifecycle hooks — `onInit`, `onDestroy`, `onRowRender`,
  `onCellRender`, `onKeyDown` extension points
- Built-in modules refactored — sorting, filtering, selection, editing, export
  each become optional modules (backward-compatible default bundle includes all)
- Third-party module contract — documented interface + TypeScript generics for
  community plugins
- Module conflict detection — warns at dev time if two modules claim the same
  extension point
- Lazy module loading — dynamic `import()` support for heavy modules (e.g.,
  Excel export) loaded on first use

**Depends on:** M1–M4 (designed from real extension patterns, not guessed).

---

## M7 · i18n, RTL & localization

**Goal:** make Strata usable worldwide.

- Locale provider — `<StrataLocaleProvider locale={...}>` context that supplies
  translated strings for all built-in UI (filter labels, empty state, pagination,
  column menu, etc.)
- Default locale bundles — English (default), German, French, Japanese, Chinese
  (Simplified), Arabic
- Custom locale support — consumers pass a `Partial<StrataLocale>` to override
  any string
- RTL layout — `dir="rtl"` support: mirrored pinning (left ↔ right), mirrored
  indent direction, mirrored sort/filter icons, correct text alignment
- Number and date formatting — locale-aware formatting via `Intl.NumberFormat`
  and `Intl.DateTimeFormat` in cell renderers and editors
- Pluralization — ICU-style plural rules for row count, selection count, etc.
- Bidirectional text handling — mixed LTR/RTL content within cells renders
  correctly

**Depends on:** M1 (base component structure), M2 (editor labels), M5 (theme
tokens for spacing direction).

---

## M8 · Documentation & developer experience

**Goal:** make Strata easy to adopt and contribute to.

- Documentation site — static site (Astro or Next.js) with guides, API
  reference, and live examples
- Interactive playground — embedded CodeSandbox / StackBlitz examples for every
  feature
- Storybook — component stories for visual testing and design review
- API reference generation — auto-generated from TSDoc comments via TypeDoc or
  similar
- Migration guides — version-to-version upgrade instructions
- Cookbook / recipes — common patterns: BOM grid, project plan, file explorer,
  org chart
- Contributing guide — architecture overview, dev setup, PR conventions, test
  expectations
- Changelog automation — conventional commits → auto-generated changelogs

**Depends on:** M1–M4 (stable API surface to document).

---

## M9 · Performance & benchmarks

**Goal:** prove Strata handles enterprise scale and keep it fast.

- Benchmark suite — automated perf tests: initial render time, scroll FPS,
  expand/collapse latency, sort/filter response time at 10K / 100K / 1M rows
- Bundle size budget — CI gate that fails if the core bundle exceeds a target
  (e.g., < 40 KB gzipped for the base grid)
- Render profiling — React Profiler integration, flamegraph snapshots in CI
- Memory profiling — heap snapshot tests for large datasets to catch leaks
- Virtualization stress tests — verify smooth 60fps scrolling at 1M rows with
  deep nesting
- Lazy hydration — optional deferred hydration for SSR scenarios where the grid
  is below the fold
- Web Worker offloading — optional worker-based sorting/filtering for datasets
  that block the main thread

**Depends on:** M1 (virtualization), M4 (lazy data source for large datasets).

---

## M10 · Framework adapters

**Goal:** bring Strata to non-React ecosystems.

- Headless core extraction — separate the state/logic layer (`@strata/core`)
  from the React rendering layer (`@strata/react`)
- Vue adapter — `@strata/vue` wrapping the headless core with Vue 3 reactivity
  and `<template>` rendering
- Svelte adapter — `@strata/svelte` with Svelte 5 runes integration
- Web Component wrapper — `@strata/wc` using a thin custom element shell for
  framework-agnostic embedding
- Vanilla JS adapter — `@strata/vanilla` for imperative DOM rendering without
  a framework
- Shared test suite — framework-agnostic behavioral tests that all adapters
  must pass

**Depends on:** M6 (plugin system provides the module boundaries that make
extraction feasible).

---

## Dependency graph

```
M1 (core)
├── M2 (editing)
│   └── M3 (hierarchy editor)
├── M4 (scale & enterprise)
├── M5 (theming)
├── M7 (i18n/RTL) ← also needs M2, M5
├── M9 (performance) ← also needs M4
│
M1–M4 → M6 (plugin system)
       → M8 (documentation)
M6 → M10 (framework adapters)
```

---

## Process

Each milestone proceeds through the same cycle: a design spec in
`docs/superpowers/specs/`, then an implementation plan, then a test-first build.
This roadmap is revised as milestones complete and priorities shift.
