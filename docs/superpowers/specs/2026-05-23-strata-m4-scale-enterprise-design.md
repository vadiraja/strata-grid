# Strata — Design Spec: M4 · Scale & Enterprise Extras

- **Date:** 2026-05-23
- **Status:** Design — awaiting review before implementation planning
- **Scope of this document:** Milestone 4 only. Builds on M1 (read-only tree grid), M2 (editing & aggregation), and M3 (hierarchy editor).

---

## 1. Overview

M4 transforms Strata from a client-side grid into a **production-grade
enterprise component** capable of handling real-world scale: millions of rows
loaded on demand, server-side sort/filter push-down, live streaming updates,
data export, and advanced filtering UX.

After M1–M3 deliver a fully functional tree grid with editing and hierarchy
manipulation, M4 adds the infrastructure that enterprise deployments require:
lazy-loading data sources, backend adapters (starting with SAP OData), export
to CSV/Excel, a filter builder UI, where-used analysis, column management, and
persisted view state.

The key architectural principle: **the existing `DataSource` interface is
extended additively** — new optional methods enable server-side capabilities
without breaking the `InMemoryDataSource` or any existing consumer code.

---

## 2. Goals & non-goals

### Goals (M4)

- **Server-side / lazy DataSource** — load-on-expand for tree data, cursor-based
  paging for flat data, loading states per node.
- **Server-side sort & filter push-down** — the grid delegates sort/filter to
  the backend when the data source supports it.
- **SAP OData DataSource adapter** — a reference implementation targeting OData
  v4 with BOM hierarchy support (STPO/MAST patterns).
- **CSV and Excel (xlsx) export** — export visible rows or all data, respecting
  current sort/filter/grouping.
- **Advanced filtering** — filter builder (AND/OR conditions), set/checkbox
  filters, global quick-search across all columns.
- **Where-used / reverse BOM explosion** — given a component, find all parent
  assemblies that use it.
- **Column-management panel** — show/hide columns, reorder, reset to default.
- **Persisted view state** — save/restore column order, widths, pinning, sort,
  filter, and expanded nodes.
- **Live / streaming updates** — `DataSource.subscribe` with granular row-level
  change events, optimistic UI reconciliation.

### Non-goals (M4)

- A formal plugin/module registry (later milestone — Tier 3).
- Collaborative / multi-user editing.
- Server-side editing or write-back (the grid tracks changes; persistence is
  the consumer's responsibility via M3's change tracking).
- Infinite scroll without tree structure (flat infinite scroll is a subset of
  paging).
- GraphQL or REST-generic adapters (OData is the reference; others follow the
  same `DataSource` pattern).

---

## 3. Architecture

### 3.1 Extended DataSource interface

The M1 `DataSource` interface gains optional methods. Existing implementations
remain valid — the grid feature-detects capabilities.

```ts
interface DataSource<TRow> {
  /** Returns rows. May accept a query for server-side operations. */
  load(query?: DataQuery<TRow>): TRow[] | Promise<TRow[]>;

  /** Optional: load children of a specific node (lazy tree). */
  loadChildren?(parentId: string, query?: DataQuery<TRow>): Promise<TRow[]>;

  /** Optional: load a page of flat data. */
  loadPage?(params: PageParams): Promise<PageResult<TRow>>;

  /** Optional: subscribe to live data changes. */
  subscribe?(onChange: DataChangeHandler<TRow>): () => void;

  /** Optional: declares which server-side capabilities are supported. */
  capabilities?(): DataSourceCapabilities;

  /** Optional: export all data (bypassing pagination). */
  exportAll?(query?: DataQuery<TRow>): Promise<TRow[]>;

  /** Optional: where-used / reverse lookup. */
  whereUsed?(nodeId: string): Promise<WhereUsedResult<TRow>[]>;
}
```

### 3.2 DataQuery — sort/filter push-down

```ts
interface DataQuery<TRow> {
  /** Server-side sort specification. */
  sort?: ColumnSort[];
  /** Server-side filter specification. */
  filters?: FilterExpression[];
  /** Global quick-search term. */
  search?: string;
  /** Expanded node ids (for server to return children). */
  expandedIds?: string[];
}

interface FilterExpression {
  columnId: string;
  operator: FilterOperator;
  value: unknown;
  /** For compound filters. */
  logic?: 'and' | 'or';
  children?: FilterExpression[];
}

type FilterOperator =
  | 'equals' | 'notEquals'
  | 'contains' | 'notContains' | 'startsWith' | 'endsWith'
  | 'greaterThan' | 'lessThan' | 'greaterOrEqual' | 'lessOrEqual'
  | 'in' | 'notIn'
  | 'between'
  | 'isEmpty' | 'isNotEmpty';
```

### 3.3 Pagination

```ts
interface PageParams {
  /** Zero-based page index, or a cursor string. */
  offset: number | string;
  /** Number of rows per page. */
  limit: number;
  /** Sort/filter to apply server-side. */
  query?: DataQuery<unknown>;
}

interface PageResult<TRow> {
  rows: TRow[];
  totalCount: number;
  /** Cursor for the next page (if cursor-based). */
  nextCursor?: string;
  /** Whether more pages exist. */
  hasMore: boolean;
}
```

### 3.4 Capability detection

```ts
interface DataSourceCapabilities {
  /** Supports server-side sorting. */
  serverSort?: boolean;
  /** Supports server-side filtering. */
  serverFilter?: boolean;
  /** Supports lazy child loading (load-on-expand). */
  lazyChildren?: boolean;
  /** Supports pagination. */
  pagination?: boolean;
  /** Supports live/streaming updates. */
  liveUpdates?: boolean;
  /** Supports where-used queries. */
  whereUsed?: boolean;
  /** Supports export-all (bypassing pagination). */
  exportAll?: boolean;
}
```

The grid checks `dataSource.capabilities()` at mount and adjusts behavior:
- If `serverSort` is true, sort changes call `load(query)` instead of
  client-side TanStack Table sorting.
- If `lazyChildren` is true, expanding a node calls `loadChildren()` instead
  of expecting children in the initial data.

### 3.5 Live / streaming updates

```ts
type DataChangeHandler<TRow> = (event: DataChangeEvent<TRow>) => void;

interface DataChangeEvent<TRow> {
  type: 'add' | 'update' | 'delete' | 'refresh';
  /** Affected rows (for add/update/delete). */
  rows?: { id: string; data?: TRow; parentId?: string | null }[];
}
```

The grid reconciles incoming changes:
- **add** — inserts rows at the correct position, respecting current sort.
- **update** — patches row data in place; re-sorts if the sort column changed.
- **delete** — removes rows and their subtrees.
- **refresh** — full reload (equivalent to calling `load()` again).

### 3.6 Export architecture

```ts
interface ExportOptions<TRow> {
  /** Export format. */
  format: 'csv' | 'xlsx';
  /** Which rows to export. */
  scope: 'visible' | 'all' | 'selected';
  /** Which columns to include (default: all visible). */
  columns?: string[];
  /** Custom filename (without extension). */
  filename?: string;
  /** For tree data: include indent level as a column? */
  includeLevel?: boolean;
  /** Custom value formatter per column. */
  formatters?: Record<string, (value: unknown, row: TRow) => string>;
  /** Sheet name for xlsx. */
  sheetName?: string;
}
```

- **CSV** — built-in, zero dependencies. Handles quoting, escaping, BOM for
  Excel compatibility.
- **Excel (xlsx)** — uses `exceljs` as an optional peer dependency. Tree-shaken
  when not used. Supports multiple sheets, column widths, and basic formatting.

Export respects the current sort/filter/grouping. For `scope: 'all'` with a
server-side data source, calls `dataSource.exportAll()` to bypass pagination.

### 3.7 Advanced filtering

Three filter UX modes, composable:

1. **Column filters** (existing M1) — enhanced with set/checkbox filters.
2. **Filter builder** — a visual AND/OR condition builder panel.
3. **Global quick-search** — a single text input that searches across all
   (or configured) columns.

```ts
interface AdvancedFilterConfig {
  /** Enable the filter builder panel. */
  filterBuilder?: boolean;
  /** Enable global quick-search. */
  quickSearch?: boolean | { columns?: string[]; debounceMs?: number };
  /** Enable set/checkbox filters on specific columns. */
  setFilters?: string[];
}
```

When the data source supports `serverFilter`, filter expressions are pushed to
the backend. Otherwise, filtering runs client-side via TanStack Table.

### 3.8 Where-used / reverse BOM

```ts
interface WhereUsedResult<TRow> {
  /** The parent assembly that uses this component. */
  parentNode: TRow;
  /** The path from root to this usage. */
  path: TRow[];
  /** Quantity used in this parent. */
  quantity?: number;
}
```

Where-used is exposed via:
- `GridApi.whereUsed(nodeId)` — programmatic access.
- A context menu action on tree rows.
- A dedicated panel/dialog showing all usages.

### 3.9 Column management panel

A slide-out or popover panel allowing users to:
- Show/hide columns via checkboxes.
- Drag to reorder columns.
- Reset to default column configuration.
- Search columns by name (useful for wide tables with 50+ columns).

### 3.10 Persisted view state

```ts
interface ViewState {
  /** Column order. */
  columnOrder: string[];
  /** Column widths. */
  columnSizing: Record<string, number>;
  /** Pinned columns. */
  columnPinning: { left: string[]; right: string[] };
  /** Current sort. */
  sorting: ColumnSort[];
  /** Current filters. */
  filters: FilterExpression[];
  /** Expanded node ids (tree mode). */
  expandedIds: string[];
  /** Hidden column ids. */
  hiddenColumns: string[];
}
```

- `GridApi.exportViewState(): ViewState` — serialize current state.
- `GridApi.importViewState(state: ViewState)` — restore a saved state.
- Optional `onViewStateChange` callback for auto-persistence (localStorage,
  backend, etc.).

---

## 4. Component breakdown (additions to M1–M3)

```
<DataGrid>
└─ GridRoot
   ├─ ... (existing components) ...
   ├─ FilterBuilderPanel     AND/OR condition builder
   ├─ QuickSearchInput       global search bar (toolbar slot)
   ├─ ColumnManagementPanel  show/hide/reorder columns
   ├─ WhereUsedDialog        reverse BOM results
   ├─ LoadingRow             skeleton/spinner for lazy-loading nodes
   ├─ PaginationBar          page controls (when paginated)
   └─ ExportMenu             export format selection
```

### New hooks

| Hook | Responsibility |
|---|---|
| `useServerDataSource` | Orchestrates server-side load, sort, filter, pagination |
| `useLazyTree` | Load-on-expand for tree nodes, loading state per node |
| `useLiveUpdates` | Subscribes to data changes, reconciles into grid state |
| `useExport` | Generates CSV/xlsx from grid data |
| `useFilterBuilder` | Manages filter expression state for the builder UI |
| `useQuickSearch` | Debounced global search across columns |
| `useColumnManagement` | Show/hide/reorder column state |
| `useViewState` | Serialize/restore grid view configuration |
| `useWhereUsed` | Reverse BOM lookup and result management |

---

## 5. Public API additions

### 5.1 DataGrid props (new in M4)

```ts
interface DataGridProps<TRow> {
  // ... existing M1/M2/M3 props ...

  /** Server-side data source (alternative to `data` array). */
  dataSource?: DataSource<TRow>;
  /** Pagination configuration. */
  pagination?: PaginationConfig;
  /** Advanced filtering configuration. */
  advancedFilter?: AdvancedFilterConfig;
  /** Export configuration. */
  export?: ExportConfig;
  /** Column management panel. */
  columnManagement?: boolean | ColumnManagementConfig;
  /** Called when view state changes (for auto-persistence). */
  onViewStateChange?: (state: ViewState) => void;
  /** Initial view state to restore. */
  defaultViewState?: ViewState;
}

interface PaginationConfig {
  /** Rows per page. Default: 50. */
  pageSize?: number;
  /** Available page size options. */
  pageSizeOptions?: number[];
  /** Pagination style. */
  mode?: 'pages' | 'loadMore' | 'infinite';
}

interface ExportConfig {
  /** Enabled export formats. */
  formats?: ('csv' | 'xlsx')[];
  /** Default filename. */
  filename?: string;
  /** Custom formatters per column. */
  formatters?: Record<string, (value: unknown, row: unknown) => string>;
}

interface ColumnManagementConfig {
  /** Whether to show the search box in the panel. */
  searchable?: boolean;
  /** Columns that cannot be hidden. */
  alwaysVisible?: string[];
}
```

### 5.2 GridApi additions

```ts
interface GridApi<TRow> {
  // ... existing M1/M2/M3 methods ...

  // M4 — Export
  exportData(options: ExportOptions<TRow>): Promise<void>;

  // M4 — View state
  exportViewState(): ViewState;
  importViewState(state: ViewState): void;

  // M4 — Where-used
  whereUsed(nodeId: string): Promise<WhereUsedResult<TRow>[]>;

  // M4 — Column management
  showColumn(columnId: string): void;
  hideColumn(columnId: string): void;
  getHiddenColumns(): string[];
  resetColumns(): void;

  // M4 — Pagination
  goToPage(page: number): void;
  setPageSize(size: number): void;
  getCurrentPage(): number;
  getTotalPages(): number;

  // M4 — Server-side
  refresh(): Promise<void>;
  setFilter(filters: FilterExpression[]): void;
  setSearch(term: string): void;
}
```

### 5.3 Loading states

```ts
interface LoadingState {
  /** Whether the grid is in initial loading state. */
  isLoading: boolean;
  /** Node ids currently loading children. */
  loadingNodes: Set<string>;
  /** Whether a page is being fetched. */
  isPageLoading: boolean;
  /** Error from the last load attempt. */
  error: Error | null;
}
```

The grid shows:
- A full-grid skeleton/spinner during initial load.
- Per-row loading indicators when expanding a lazy node.
- A pagination loading indicator during page transitions.

---

## 6. Data flow (server-side)

### Load-on-expand flow

```
1. User expands a tree node
2. Grid checks capabilities → lazyChildren: true
3. Call dataSource.loadChildren(parentId, query)
4. Show LoadingRow placeholder under the parent
5. Receive children → insert into tree state
6. Remove LoadingRow → render children
7. If loadChildren rejects → show error inline; allow retry
```

### Server-side sort/filter flow

```
1. User changes sort or filter
2. Grid checks capabilities → serverSort/serverFilter: true
3. Build DataQuery from current sort + filter state
4. Call dataSource.load(query)
5. Show loading overlay
6. Receive new rows → replace grid data
7. Re-render with new data
```

### Pagination flow

```
1. Grid mounts with pagination config
2. Call dataSource.loadPage({ offset: 0, limit: pageSize })
3. Render first page + PaginationBar
4. User clicks "Next" → loadPage({ offset: next, limit: pageSize })
5. Show page loading indicator
6. Receive page → replace visible rows; update pagination state
```

### Live update flow

```
1. Grid mounts → call dataSource.subscribe(handler)
2. Backend pushes DataChangeEvent
3. Handler reconciles:
   - 'add': insert row at correct sorted position
   - 'update': patch row data; re-sort if needed
   - 'delete': remove row + subtree
   - 'refresh': full reload
4. Grid re-renders affected rows only (virtualization helps)
5. On unmount → call unsubscribe()
```

---

## 7. SAP OData DataSource adapter

A reference `DataSource` implementation for SAP OData v4 services, targeting
BOM hierarchy patterns (STPO/MAST tables).

```ts
interface ODataDataSourceConfig<TRow> {
  /** OData service URL. */
  serviceUrl: string;
  /** Entity set name (e.g., 'BillOfMaterials'). */
  entitySet: string;
  /** Maps OData entity properties to TRow fields. */
  fieldMapping: Record<string, keyof TRow | ((entity: unknown) => unknown)>;
  /** OData navigation property for children (e.g., 'Components'). */
  childrenNavProperty?: string;
  /** OData property for parent key (flat hierarchy). */
  parentKeyProperty?: string;
  /** Authentication headers or token provider. */
  auth?: ODataAuth;
  /** Custom $expand / $select for initial load. */
  defaultExpand?: string;
  /** Batch request configuration. */
  batch?: { enabled: boolean; maxBatchSize?: number };
}
```

The adapter:
- Translates `DataQuery` sort/filter into OData `$orderby` / `$filter` syntax.
- Uses `$expand` for eager child loading or navigation properties for lazy
  loading.
- Supports OData `$count` for total row counts.
- Handles OData error responses gracefully.
- Supports batch requests for bulk operations.

---

## 8. Error handling & edge cases

| Edge case | Handling |
|---|---|
| `loadChildren` rejects | Show inline error on the parent row; retry button; don't collapse |
| `loadPage` rejects | Show error state; keep previous page visible; retry affordance |
| Network timeout | Configurable timeout; abort controller; show timeout message |
| Stale data after live update | Sequence numbers / ETags; discard out-of-order updates |
| Export of 100k+ rows | Stream to file; show progress; allow cancel |
| `exportAll` not supported | Fall back to exporting only loaded/visible rows; warn user |
| Filter builder produces invalid expression | Validate before applying; highlight invalid conditions |
| Column management hides all columns | Prevent; require at least one visible column |
| View state references deleted columns | Gracefully ignore unknown column ids; warn in dev mode |
| OData service returns 401/403 | Surface auth error; allow re-auth callback |
| Live update arrives during edit | Queue update; apply after edit commits/discards |
| Pagination + tree mode | Not supported simultaneously; dev-warn if both configured |
| Where-used on root node | Return empty result (root has no parents) |
| Concurrent loadChildren calls | Deduplicate; only one in-flight request per node |

---

## 9. Testing strategy

| Layer | Tools | Coverage |
|---|---|---|
| Unit | Vitest | DataQuery building, filter expression parsing, CSV generation, OData query translation, view state serialization, where-used logic |
| Component | Vitest + RTL | FilterBuilder UI, ColumnManagementPanel, PaginationBar, QuickSearch, LoadingRow, ExportMenu |
| Integration | Vitest + RTL + MSW | Full DataGrid with mocked server data source, lazy loading, pagination, live updates |
| E2E | Playwright | Real OData service mock, export file download, filter builder interactions, column management |

**MSW (Mock Service Worker)** is used for integration tests to simulate server
responses without a real backend.

---

## 10. Success criteria for M4

M4 is complete when:

1. A server-side `DataSource` can lazy-load tree children on expand with
   loading indicators and error recovery.
2. Sort and filter operations are pushed to the server when the data source
   declares those capabilities.
3. Pagination works in pages, load-more, and infinite-scroll modes.
4. The SAP OData adapter successfully loads a BOM hierarchy from an OData v4
   service (tested against a mock).
5. CSV export produces correct output for flat and tree data with proper
   quoting/escaping.
6. Excel export produces a valid .xlsx file with column widths and tree
   indentation.
7. The filter builder allows AND/OR compound conditions and produces correct
   `FilterExpression` objects.
8. Global quick-search filters across all searchable columns with debouncing.
9. Where-used returns correct parent assemblies for a given component.
10. The column management panel allows show/hide/reorder/reset.
11. View state can be exported, persisted, and restored without data loss.
12. Live updates reconcile correctly (add/update/delete) without disrupting
    the user's scroll position or active edit.
13. All features have unit tests, component tests, and integration tests.

---

## 11. Implementation plan structure

| Plan | Title | Scope |
|---|---|---|
| **Plan 1** | Extended DataSource & capabilities | `DataSource` interface evolution, `DataQuery`, `DataSourceCapabilities`, capability detection |
| **Plan 2** | Lazy tree loading | `loadChildren`, `useLazyTree` hook, `LoadingRow`, error/retry UX |
| **Plan 3** | Server-side sort & filter | Sort/filter push-down, `useServerDataSource` hook, loading states |
| **Plan 4** | Pagination | `loadPage`, `PaginationBar`, page/loadMore/infinite modes |
| **Plan 5** | Live / streaming updates | `DataChangeHandler`, `useLiveUpdates`, reconciliation logic |
| **Plan 6** | CSV & Excel export | `useExport`, CSV writer, xlsx integration, `ExportMenu` |
| **Plan 7** | Advanced filtering | Filter builder UI, set filters, global quick-search, `useFilterBuilder` |
| **Plan 8** | Where-used / reverse BOM | `whereUsed` API, `WhereUsedDialog`, context menu integration |
| **Plan 9** | Column management & view state | `ColumnManagementPanel`, `useViewState`, persist/restore |
| **Plan 10** | SAP OData adapter | `ODataDataSource`, query translation, auth, batch support |
| **Plan 11** | Flex columns | `ColumnDef.flex`, `computeFlexWidths`, `useFlexColumnSizing`, drag-to-fix policy |

---

## 12. Flex columns — behavior notes & caveats

These notes are the source of truth for the M8 documentation site. They
describe the intended semantics, the trade-offs taken, and the edge cases that
docs must surface to consumers.

### 12.1 Semantics

- `ColumnDef.flex?: number` — when set on one or more columns, those columns
  absorb `containerWidth − sumOfFixedColumnWidths`, split by ratio.
- `minWidth` and `maxWidth` clamp the computed share. When the container is
  too narrow for the fixed columns alone, flex columns collapse to `minWidth`
  and horizontal scroll appears.
- Flex columns may be pinned (`pin: 'left' | 'right'`). Distribution is
  computed across all flex columns regardless of pin section — pinning only
  affects placement, not the size share.

### 12.2 User-drag policy ("drag converts flex to fixed")

When the user resizes a flex column by dragging its header edge, that column
is converted to a fixed-width column for the remainder of the session (and
across reloads, via persisted view state). It is removed from the flex
distribution pool on subsequent container resizes.

**Why:** preserving flex on a manually-resized column would make the next
viewport resize silently undo the user's action. The "I just dragged it to
300px" intent must win.

**Restoring flex behavior:** there is no automatic "un-fix" gesture. To
restore flex distribution to a manually-resized column, the consumer must
clear that column id from `columnSizing` (e.g., via a "reset column widths"
button using the `GridApi`).

### 12.3 Persisted view state precedence

`ColumnSizingState` (persisted via `useViewState`) always wins over `flex`.
On reload, any column present in the persisted sizing map renders at that
width, regardless of its `flex` value. This is consistent with the drag
policy: an explicit, recorded width is treated as user intent.

### 12.4 Column resize interaction

The header-edge drag handler writes to TanStack's `columnSizing` state. The
`useFlexColumnSizing` hook detects this by comparing the current sizing
value to the last value it wrote — any divergence is interpreted as a user
drag and the column id is added to a session-local "user-fixed" set.

Caveat for consumers controlling `columnSizing` externally: programmatic
writes to `columnSizing` that differ from the last library-computed value
will also be treated as user drags (the library cannot distinguish them).
If a consumer wants to keep a column flex while writing other columns'
widths, they should avoid writing the flex column's id.

### 12.5 Virtualization

Column virtualization consumes `column.getSize()`. Because flex widths are
pushed into `columnSizing` (which TanStack's `getSize()` reads from), the
virtualizer sees up-to-date widths on every container resize. Right-pinned
columns are repositioned automatically because their absolute right offset
is computed from the same source.

### 12.6 Tests

Three areas worth covering when extending:

- **Pure distribution** — `compute-flex-widths.test.ts` covers ratios,
  clamps, user-fixed exclusion, and the zero-container case.
- **Drag-to-fix** — integration test should drag a flex column, then resize
  the container, and assert the dragged column did not redistribute.
- **Reload precedence** — verify that initializing the grid with both
  `flex` and a persisted `columnSizing` entry yields the persisted width.

### 12.7 Future extensions (not in M4)

- `GridApi.sizeColumnsToFit()` — proportionally rescale all visible columns
  to the container, equivalent to AG Grid's method. Trivially implementable
  on top of `flex` by assigning `flex: 1` programmatically.
- "Reset column widths" command — clears `columnSizing` so flex behavior
  resumes on the user-fixed columns. Belongs in the column-management panel.
- Per-section flex (only the center scroll area) — not currently planned;
  the whole-container model is simpler and matches user expectation.
