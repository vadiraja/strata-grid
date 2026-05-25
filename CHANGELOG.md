# Changelog

All notable changes to `strata-grid` are documented here. The format is loosely based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- **Range selection** — pointer-drag, Shift+Arrow extension, and `Ctrl/Cmd+C` to copy
  the rectangular range as TSV. Range is independent from row selection.
- **Fill handle** — a small drag affordance at the bottom-right of the focus cell.
  Drag to extend the range; release emits `onFillRange({ source, targets, value })`.
- **Status bar** — opt-in `statusBar` prop. Default segments include row count,
  selected count, and range Sum/Avg/Min/Max/Count. Consumers can append, prepend,
  or replace segments via `StatusBarConfig`.
- **Context menu** — opt-in `contextMenu` prop. Defaults include Copy, Auto-size,
  Pin left/right, Unpin, Expand/Collapse all. Override per target via
  `ContextMenuConfig.getItems(ctx)`.
- **Auto-size column** — double-clicking a column's resize handle fits the column
  to the widest visible cell. Programmatic via `GridApi.autoSizeColumn(id)` and
  `autoSizeAllColumns()`.

### Fixed

- `density="comfortable"` (and `"compact"`) caused row overlap in tree and flat grids:
  the virtualizer's `estimateSize` was hardcoded to 32px while cell heights followed
  `--strata-row-height` (24 / 32 / 44 by density). The virtualizer now resolves the
  row height from the `density` prop so cell layout and virtual row slots stay in
  sync. ([#9](https://github.com/vadiraja/strata-grid/issues/9))
- Column filter popover was clipped by the header row's `overflow: hidden` and
  could appear behind adjacent cells. The popover is now rendered through a portal
  anchored to the grid root with computed top/left, repositions on scroll/resize,
  and sits above sibling cells (`z-index: 1000`).
- Sort indicator arrow rendered at the default icon size (16px) and visually
  dominated header text. It now renders at 12px to match the header type scale.

## [0.2.0-alpha.0] — 2026-05-23

### Added

- **Typed column filters** — `ColumnDef.filter` now accepts a configuration object alongside
  the existing `'text'` / `'number'` string shortcuts. New types: `text`, `number`,
  `select` (single + multi), `boolean`, `date` (single + range). Each accepts an
  `operators?` array that constrains both the filter UI menu and the emitted operator.
  See the [typed filters guide](https://vadiraja.github.io/strata-grid/guides/typed-filters/).
- **`onPaginationChange`** prop on `<DataGrid>` — surfaces `{ currentPage, pageSize,
  totalCount, totalPages, isLoading, hasMore, error }` for status-bar rendering.
  Replaces the previous adapter-subscribe workaround for consumers who needed
  loading/total-count state outside the grid.
- **`rowActions`** prop on `<DataGrid>` — first-class actions column with `inline`
  (icon button strip) or `menu` (kebab dropdown) displays, per-row `visible(row)` and
  `disabled(row)` predicates, configurable pinning, and built-in keyboard / ARIA
  accessibility.
- `between` operator now accepts ISO date strings (`['2026-01-01', '2026-03-31']`) via
  a lexicographic fallback when numeric coercion produces `NaN`.

### Fixed

- `use-grid-table.ts:fromTanstackFilters` previously emitted every per-column filter as
  `operator: 'contains'` regardless of the column type. It now detects structured
  `{ operator, value }` filter values from the typed filter UIs and emits the correct
  operator. This was the source of `where=status:contains:On` requests against enum
  columns whose backends only support `equals` / `in`.

### Backward compatibility

No breaking changes. Existing `filter: 'text'` and `filter: 'number'` consumers
continue to work without modification. Primitive filter values still serialize to
`operator: 'contains'` for text columns when no structured value is provided.

### Validation

Driven by the ProtoTrack spike against `0.1.0-alpha.0`. See
[issue #8](https://github.com/vadiraja/strata-grid/issues/8) for the report and
[the 0.2.0 plan](docs/superpowers/plans/2026-05-23-strata-0.2.0-server-driven-list-ergonomics.md)
for the implementation history.

## [0.1.0-alpha.0] — 2026-05-23

Initial public alpha. Core grid with virtualization, tree mode (nested children +
flat parent-pointer), per-column sort/filter, row selection (single + multi +
tri-state cascade in tree mode), column resize/reorder/pinning, cell + row editing,
aggregation, hierarchy editor (add/delete/move/reparent with multi-level undo),
pluggable `DataSource` interface, `InMemoryDataSource`, OData adapter, server-side
pagination, lazy tree loading, live updates, where-used, CSV + XLSX export,
quick search, advanced filter builder, view-state persistence, themes (light, dark,
high-contrast), density modes, print stylesheet, runtime theme composition, ARIA
`treegrid` semantics.

Apache-2.0 licensed.
