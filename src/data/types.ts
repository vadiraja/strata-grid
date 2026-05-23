import type { ColumnSort } from '../model/types';

// --- Filter expressions ---

/**
 * Operators available for filter conditions.
 */
export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterOrEqual'
  | 'lessOrEqual'
  | 'in'
  | 'notIn'
  | 'between'
  | 'isEmpty'
  | 'isNotEmpty';

/**
 * A single filter condition or a compound group of conditions.
 */
export interface FilterExpression {
  /** The column to filter on (leaf condition). */
  columnId?: string;
  /** The comparison operator (leaf condition). */
  operator?: FilterOperator;
  /** The value to compare against (leaf condition). */
  value?: unknown;
  /** Logical combinator for compound expressions. */
  logic?: 'and' | 'or';
  /** Child expressions for compound filters. */
  children?: FilterExpression[];
}

// --- Typed column filter configs (0.2.0) ---

/** An option for a `select` column filter. */
export interface SelectOption<TValue = unknown> {
  label: string;
  value: TValue;
}

/**
 * Column filter configuration. Strings are backward-compat shortcuts for the
 * simple cases — `'text'` resolves to `{ type: 'text' }`, `'number'` to
 * `{ type: 'number' }`. Use the object form to:
 *
 * - constrain allowed operators per column (`operators?`)
 * - render a `select`, `boolean`, or `date` input instead of a text input
 * - emit `in` / `notIn` for multi-select or `between` for date ranges
 */
export type ColumnFilterConfig<TValue = unknown> =
  | 'text'
  | 'number'
  | { type: 'text'; operators?: FilterOperator[] }
  | { type: 'number'; operators?: FilterOperator[] }
  | {
      type: 'select';
      options: SelectOption<TValue>[];
      /** When true, emits operator `'in'` (or `'notIn'`) with array values. */
      multi?: boolean;
      operators?: FilterOperator[];
    }
  | { type: 'boolean' }
  | {
      type: 'date';
      operators?: FilterOperator[];
      /** When true, emits operator `'between'` with `[from, to]` value. */
      range?: boolean;
    };

/**
 * Normalized form of `ColumnFilterConfig` used internally by the filter UI.
 * All defaults filled in; no string shortcuts.
 */
export type ResolvedColumnFilter =
  | { type: 'text'; operators: FilterOperator[] }
  | { type: 'number'; operators: FilterOperator[] }
  | {
      type: 'select';
      options: SelectOption[];
      multi: boolean;
      operators: FilterOperator[];
    }
  | { type: 'boolean'; operators: FilterOperator[] }
  | { type: 'date'; operators: FilterOperator[]; range: boolean };

// --- Data query (sort/filter push-down) ---

/**
 * Query object sent to server-side data sources for sort/filter push-down.
 */
export interface DataQuery {
  /** Server-side sort specification. */
  sort?: ColumnSort[];
  /** Server-side filter specification. */
  filters?: FilterExpression[];
  /** Global quick-search term. */
  search?: string;
  /** Expanded node ids (for server to know which children to include). */
  expandedIds?: string[];
}

// --- Pagination ---

/**
 * Parameters for a paginated data request.
 */
export interface PageParams {
  /** Zero-based offset or a cursor string for cursor-based pagination. */
  offset: number | string;
  /** Number of rows per page. */
  limit: number;
  /** Sort/filter to apply server-side. */
  query?: DataQuery;
}

/**
 * Result of a paginated data request.
 */
export interface PageResult<TRow> {
  /** The rows for this page. */
  rows: TRow[];
  /** Total number of rows across all pages. */
  totalCount: number;
  /** Cursor for the next page (cursor-based pagination). */
  nextCursor?: string;
  /** Whether more pages exist after this one. */
  hasMore: boolean;
}

// --- Capability detection ---

/**
 * Declares which server-side capabilities a DataSource supports.
 * The grid uses this to decide client-side vs server-side behavior.
 */
export interface DataSourceCapabilities {
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

// --- Live / streaming updates ---

/**
 * Event describing a data change from the backend.
 */
export interface DataChangeEvent<TRow> {
  /** The type of change. */
  type: 'add' | 'update' | 'delete' | 'refresh';
  /** Affected rows (for add/update/delete). */
  rows?: { id: string; data?: TRow; parentId?: string | null }[];
}

/**
 * Handler for live data change events.
 */
export type DataChangeHandler<TRow> = (event: DataChangeEvent<TRow>) => void;

// --- Where-used ---

/**
 * A single where-used result — one parent assembly that uses a component.
 */
export interface WhereUsedResult<TRow> {
  /** The parent assembly that uses this component. */
  parentNode: TRow;
  /** The path from root to this usage (ancestors in order). */
  path: TRow[];
  /** Quantity used in this parent. */
  quantity?: number;
}

// --- Loading state ---

/**
 * Loading state exposed by the grid for server-side operations.
 */
export interface LoadingState {
  /** Whether the grid is in initial loading state. */
  isLoading: boolean;
  /** Node ids currently loading children. */
  loadingNodes: Set<string>;
  /** Whether a page is being fetched. */
  isPageLoading: boolean;
  /** Error from the last load attempt. */
  error: Error | null;
}
