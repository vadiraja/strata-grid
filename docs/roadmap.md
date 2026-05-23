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
| M2 | Editing & aggregation | Specced — see [`docs/superpowers/specs/2026-05-22-strata-m2-editing-aggregation-design.md`](superpowers/specs/2026-05-22-strata-m2-editing-aggregation-design.md) |
| M3 | Hierarchy / BOM editor | Specced — see [`docs/superpowers/specs/2026-05-23-strata-m3-hierarchy-editor-design.md`](superpowers/specs/2026-05-23-strata-m3-hierarchy-editor-design.md) |
| M4 | Scale & enterprise extras | Specced — see [`docs/superpowers/specs/2026-05-23-strata-m4-scale-enterprise-design.md`](superpowers/specs/2026-05-23-strata-m4-scale-enterprise-design.md) |
| Later | Plugin system & cross-cutting | Backlog |

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

**Depends on:** M1 (the `DataSource` seam).

---

## Later / cross-cutting

- **Tier 3 plugin system** — a formal `registerModules([...])` registry for
  optional, tree-shakeable feature modules. Deferred deliberately so it is
  designed from the real extension patterns of M1–M3, not guessed at up front.
- i18n / localization and RTL support
- Documentation site
- Additional theme presets

---

## Process

Each milestone proceeds through the same cycle: a design spec in
`docs/superpowers/specs/`, then an implementation plan, then a test-first build.
This roadmap is revised as milestones complete and priorities shift.
