# Changelog

All notable changes to `strata-grid` are documented here. The format is loosely based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
