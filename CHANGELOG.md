# Changelog

All notable changes to `strata-grid` are documented here. The format is loosely based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.2] — 2026-06-03

### Changed

- **Softer default border treatment** — data-cell vertical separators and the
  frozen/pinned pane now use lighter defaults, and the heavy frozen-pane "wall"
  (a hard `2px 0 0` shadow) is replaced by a subtle shadow. This is a visible
  change to the default light theme. Restore the previous look by setting
  `--strata-border-cell-vertical: #e5e5e7`, `--strata-border-frozen: #d1d1d6`,
  `--strata-shadow-frozen: 2px 0 0 #d1d1d6`, and
  `--strata-shadow-frozen-right: -2px 0 0 #d1d1d6`.

### Added

- **Granular border tokens** — `--strata-border-cell-vertical`,
  `--strata-border-header-vertical`, `--strata-border-frozen`,
  `--strata-shadow-frozen`, and `--strata-shadow-frozen-right` let consumers tune
  vertical separators and the left/right frozen-pane treatment independently of
  horizontal rules and the grid outline.
- **Auto-collapsing horizontal scrollbar row** — the scrollbar row collapses its
  height when columns fit the viewport, removing the empty scrollbar strip.

## [0.4.1] — 2026-06-01

### Fixed

- **Phantom horizontal scrollbar with selection / row editing** — flex column
  widths were distributed across the full grid-root width, ignoring the space
  reserved by the selection checkbox column and the row-edit actions pane. The
  flex columns therefore overshot the available track by exactly that reserved
  width (e.g. 40px for selection), producing a horizontal scrollbar with
  nothing to scroll. Flex sizing now subtracts the reserved chrome width so
  columns fit the track exactly.
- **Phantom horizontal scrollbar after a column resize** — the column
  virtualizer caches its measurements and only recomputes them when its
  size-cache version changes, not when a column width changes. After a flex
  column grew or shrank (e.g. on window resize), the body kept a stale trailing
  spacer sized to the old total, overflowing past the header by exactly the
  width delta. The virtualizer now re-measures whenever the column widths
  change, so the body track always matches the rendered columns.

## [0.4.0] — 2026-05-26

### Added

- **Cell flash on update** — opt-in `flashOnUpdate` prop. Diffs row values
  between renders and briefly applies `.strata-cell-flash` to cells whose
  value changed. Pairs naturally with `useLiveUpdates` but works with any
  source of row changes. Configurable duration; respects
  `prefers-reduced-motion`.
- **Conditional cell styling** — `ColumnDef.cellClass(ctx)` and
  `ColumnDef.cellStyle(ctx)` for per-row class / inline style overrides
  without writing a full custom `cell` renderer. Both receive the same
  `CellContext<TRow>` as `cell`.

### Fixed

- **Quick search icon** — `.strata-quick-search-icon` had no CSS so the
  search glyph rendered at the default 16px icon size with no positioning.
  It is now absolutely positioned inside the input (14px, muted, tints
  accent on focus), and the input grows its left padding to match. Native
  WebKit search decorations are suppressed so the icon is the only
  affordance.
- **Empty horizontal scrollbar track** — when the grid had no horizontal
  overflow the track still rendered as a gray pill at the bottom of the
  grid. The track and thumb now both fade out (and stop receiving pointer
  events) when `maxScrollLeft <= 0`.
- **Scrollbar thumb math at max scroll** — the thumb's width and travel
  were computed against the scroller's `clientWidth`, but the track sits
  inside an 8px inset on each side. At `scrollLeft === maxScrollLeft` the
  thumb either overshot or appeared to stop short of the track's right
  edge, which users read as "there's more data hidden to the right." The
  track's actual width is now observed via `ResizeObserver` and used as the
  basis for thumb sizing and translation, so the thumb is flush with both
  track edges at the scroll extremes.

## [0.3.0-alpha.0] — 2026-05-26

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
