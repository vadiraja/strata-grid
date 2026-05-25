import type { ReactNode } from 'react';
import type { RowData } from '@tanstack/react-table';
import type { ExportOptions } from '../export/types';
import type { ColumnFilterConfig, FilterExpression } from '../data/types';
import type { ViewState } from './view-state-types';

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

/** Sort direction for a column. */
export type SortDirection = 'asc' | 'desc';

/** A single column's sort specification. */
export interface ColumnSort {
  /** The column id to sort by. */
  columnId: string;
  /** The sort direction. */
  direction: SortDirection;
}

/** The complete sorting state — an ordered list of column sorts. */
export type SortingState = ColumnSort[];

/** Built-in filter types. */
export type FilterType = 'text' | 'number';

/** Ordered list of column ids. */
export type ColumnOrderState = string[];

/** Left/right pinned column ids. Empty arrays mean no pinned columns. */
export interface ColumnPinningState {
  left?: string[];
  right?: string[];
}

/** Per-column widths, keyed by column id. */
export type ColumnSizingState = Record<string, number>;

/**
 * Definition of a single grid column.
 *
 * Later milestones extend this interface with pinning and
 * column group options.
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
  /** Maximum column width in pixels. Only honored when `flex` is set. */
  maxWidth?: number;
  /**
   * Grow factor — when set, this column absorbs a share of the leftover
   * horizontal space (container width minus the sum of all fixed-width
   * columns). Multiple flex columns split the remainder by ratio. Honors
   * `minWidth` and `maxWidth`. The user explicitly resizing a flex column
   * converts it to fixed width.
   */
  flex?: number;
  /**
   * Marks this column as the tree column — the one that shows the hierarchy
   * (depth indentation and the expand/collapse control). Tree mode only;
   * exactly one column should set it. If none does, the first column is used
   * and a development warning is emitted.
   */
  isTreeColumn?: boolean;
  /**
   * Whether this column is sortable. Defaults to `true`.
   * Set to `false` to disable sorting for this column.
   */
  sortable?: boolean;
  /**
   * Filter configuration for this column. Accepts:
   *
   * - `'text'` — case-insensitive substring matching (default text operators)
   * - `'number'` — numeric comparison (default number operators)
   * - `{ type, operators?, ... }` — typed config: `text` | `number` | `select`
   *   | `boolean` | `date`. Constrains the filter UI and emitted operators
   * - `false` — disable filtering
   *
   * Defaults to `false` (no filter). See `ColumnFilterConfig` for the full
   * object shape.
   */
  filter?: ColumnFilterConfig | false;
  /**
   * Pins (freezes) this column to the left or right edge of the grid.
   * Pinned columns are always visible and never column-virtualized.
   * Defaults to unpinned (center).
   */
  pin?: 'left' | 'right';
  /** Whether this column is editable. Default: false. */
  editable?: boolean | ((row: TRow) => boolean);
  /** Built-in editor type. */
  editorType?: EditorType;
  /** Custom editor component. Takes precedence over editorType. */
  editor?: (ctx: EditorContext<TRow>) => ReactNode;
  /** Editor options (e.g., choices for select editor). */
  editorOptions?: Record<string, unknown>;
  /** Validation rules for this column. */
  validate?: Validator<TRow> | Validator<TRow>[];
  /** Aggregation function for group/parent rows. */
  aggregate?: AggregateType | ((values: unknown[]) => unknown);
  /** Optional formatter for group/footer aggregate values. */
  aggregateFormatter?: (value: unknown) => ReactNode;
}

/**
 * A column group renders a stacked header that spans child columns.
 * Groups may contain leaf columns or nested groups.
 */
export interface ColumnGroup<TRow> {
  /** Unique, stable group id. */
  groupId: string;
  /** Group header content. */
  header: string | ReactNode;
  /** Child columns or nested column groups. */
  columns: AnyColumn<TRow>[];
}

/** A leaf column definition or a grouped column definition. */
export type AnyColumn<TRow> = ColumnDef<TRow> | ColumnGroup<TRow>;

/** Returns true when a public column entry is a column group. */
export function isColumnGroup<TRow>(
  column: AnyColumn<TRow>,
): column is ColumnGroup<TRow> {
  return 'groupId' in column && 'columns' in column;
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
 * Configures row selection behavior on the grid.
 *
 * In tree mode with `cascade: true`, selecting a parent selects all
 * descendants and deselecting a parent deselects all descendants. Parents with
 * partially-selected children show an indeterminate checkbox.
 */
export interface SelectionConfig {
  /** Selection mode: single-select or multi-select. */
  mode: 'single' | 'multi';
  /** Tree mode only: cascade selection between parents and descendants. */
  cascade?: boolean;
}

/** The selection state passed to `onSelectionChange`. */
export interface SelectionState {
  /** Set of currently selected row ids. */
  selectedIds: Set<string>;
}

/**
 * A single per-row action shown in the row-actions column.
 */
export interface RowAction<TRow> {
  /** Stable, unique id for the action. */
  id: string;
  /** Human-readable label (used for aria-label, menu text, and tooltip). */
  label: string;
  /** Optional icon node. Renders as the button content in `inline` mode. */
  icon?: ReactNode;
  /** Click handler — receives the row and the original mouse event. */
  onClick: (row: TRow, event: React.MouseEvent) => void;
  /** When provided, hides the action for rows where this returns false. */
  visible?: (row: TRow) => boolean;
  /** When provided, disables the action for rows where this returns true. */
  disabled?: (row: TRow) => boolean;
}

/**
 * Configures the row-actions column. When set, `<DataGrid>` injects a
 * synthetic pinned column at the configured edge that renders per-row
 * action buttons.
 */
export interface RowActionsConfig<TRow> {
  /** The actions to render per row. */
  actions: RowAction<TRow>[];
  /**
   * Display style. `'inline'` renders icon buttons in a horizontal strip.
   * `'menu'` renders a kebab dropdown. Defaults to `'inline'`.
   */
  display?: 'inline' | 'menu';
  /**
   * Which edge to pin the actions column to. Default: `'right'`. Set to
   * `false` to leave it unpinned.
   */
  pin?: 'left' | 'right' | false;
  /** Column width in pixels. Defaults to a width derived from the action count. */
  width?: number;
}

/** Built-in grid themes. */
export type GridTheme = 'light' | 'dark' | 'high-contrast-light' | 'high-contrast-dark' | 'auto' | (string & {});

/** Visual density — controls row height and cell padding. */
export type Density = 'compact' | 'standard' | 'comfortable';

/**
 * Configures grid-level editing behavior.
 */
export interface EditableConfig {
  /** Edit mode: 'cell' (default) or 'row'. */
  mode?: 'cell' | 'row';
  /** How to activate cell editing. Default: 'doubleClick'. */
  activateOn?: 'doubleClick' | 'singleClick' | 'enter';
  /** Whether to show a visual indicator on editable cells. Default: true. */
  showEditableIndicator?: boolean;
}

/** Configures aggregate rendering in grouped rows and the footer. */
export interface ExtendedQuantityConfig {
  /** Per-component quantity column used as the roll-up source. */
  sourceColumn: string;
  /** Column where the computed extended quantity is displayed. */
  targetColumn: string;
  /** Built-in multiply-down roll-up or a custom cascade function. */
  compute?: 'multiply-down' | ((parentQty: number, childQty: number) => number);
}

/**
 * Grid-level aggregation configuration. Aggregated values appear on group/parent
 * rows in tree mode and in the optional footer totals row.
 */
export interface AggregationConfig {
  /** When true, the footer shows aggregate values for configured columns. */
  showFooterAggregates?: boolean;
  /** Tree-mode BOM extended quantity roll-up. */
  extendedQuantity?: ExtendedQuantityConfig;
  /** Reserved for tree parent aggregate display. */
  showParentAggregates?: boolean;
}

/**
 * Configures pagination behavior.
 */
export interface PaginationConfig {
  /** Rows per page. Default: 50. */
  pageSize?: number;
  /** Available page size options for the user to choose from. */
  pageSizeOptions?: number[];
  /** Pagination mode. Default: 'pages'. */
  mode?: 'pages' | 'loadMore' | 'infinite';
}

/** Configures advanced filter-builder and quick-search UI/state. */
export interface AdvancedFilterConfig {
  /** Enables the filter builder surface. */
  filterBuilder?: boolean;
  /** Enables global quick-search. */
  quickSearch?: boolean | { columns?: string[]; debounceMs?: number };
  /** Initial filter expression. */
  defaultExpression?: FilterExpression;
}

/** Configures CSV/XLSX export. */
export interface ExportConfig<TRow = unknown> {
  /** Enabled export formats. */
  formats?: ExportOptions<TRow>['format'][];
  /** Default filename without extension. */
  filename?: string;
  /** Custom value formatters by column id. */
  formatters?: ExportOptions<TRow>['formatters'];
}

/** Configures the column management panel. */
export interface ColumnManagementConfig {
  /** Whether the panel supports searching columns. */
  searchable?: boolean;
  /** Columns that cannot be hidden. */
  alwaysVisible?: string[];
}

export type { ViewState };

/**
 * Context passed to a custom editor component.
 */
export interface EditorContext<TRow> {
  /** The current cell value. */
  value: unknown;
  /** The row data. */
  row: TRow;
  /** The column definition. */
  column: ColumnDef<TRow>;
  /** The row's unique id. */
  rowId: string;
  /** Call to update the pending value. */
  onChange: (newValue: unknown) => void;
  /** Call to commit the edit. */
  onCommit: () => void;
  /** Call to discard the edit. */
  onDiscard: () => void;
  /** Current validation state. */
  validation: ValidationState;
}

/** Validation state for a cell. */
export interface ValidationState {
  status: 'valid' | 'invalid' | 'validating';
  message?: string;
}

/** A validator function for a column. */
export type Validator<TRow> = (
  value: unknown,
  row: TRow,
) => ValidationResult | Promise<ValidationResult>;

/** Validation result: true = valid, string = error message. */
export type ValidationResult = true | string;

/** Event fired when a cell edit starts. */
export interface CellEditEvent<TRow> {
  rowId: string;
  columnId: string;
  row: TRow;
  value: unknown;
}

/** Event fired when a cell edit ends. */
export interface CellEditEndEvent<TRow> extends CellEditEvent<TRow> {
  newValue: unknown;
  committed: boolean;
}

/** Event fired when a row enters edit mode. */
export interface RowEditEvent<TRow> {
  rowId: string;
  row: TRow;
}

/** Event fired when a row exits edit mode. */
export interface RowEditEndEvent<TRow> extends RowEditEvent<TRow> {
  changes: Record<string, { oldValue: unknown; newValue: unknown }>;
  committed: boolean;
}

/** Built-in aggregation types. */
export type AggregateType = 'sum' | 'avg' | 'min' | 'max' | 'count';

/** Built-in editor types. */
export type EditorType = 'text' | 'number' | 'select' | 'date' | 'checkbox';

/**
 * Augments TanStack's `ColumnMeta` so every TanStack column carries the
 * original Strata column definition.
 */
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    strataColumn: ColumnDef<TData>;
  }
}

// ===== 0.3.0: interactive cell UX =====

export interface CellPositionRef {
  rowId: string;
  columnId: string;
}

export interface CellRangeRef {
  topRowId: string;
  bottomRowId: string;
  columnIds: string[];
}

export interface FillRangeEvent {
  /** Source cell whose value is being repeated. */
  source: CellPositionRef;
  /** Target cells (excludes the source). */
  targets: CellPositionRef[];
  /** The value being copied (post-read). */
  value: unknown;
}

export interface ContextMenuTarget {
  kind: 'cell' | 'row' | 'header';
  rowId?: string;
  columnId?: string;
}

export interface ContextMenuContext<TRow> {
  target: ContextMenuTarget;
  /** All currently selected row ids. */
  selectedRowIds: string[];
  /** The current cell range, if any. */
  range: import('./cell-range').CellRange | null;
  /** The row data, if `kind === 'cell' | 'row'`. */
  row?: TRow;
}

export interface ContextMenuConfig<TRow> {
  /** Replace the default item list outright. */
  items?: import('../components/ContextMenu').ContextMenuItem[];
  /** Compute items dynamically from the target context. Replaces defaults. */
  getItems?: (
    ctx: ContextMenuContext<TRow>,
  ) => import('../components/ContextMenu').ContextMenuItem[];
  /** Merge consumer items with the default item list. Defaults to `'replace'`. */
  mode?: 'replace' | 'append' | 'prepend';
}

export interface StatusBarContext<TRow> {
  totalRowCount: number;
  selectedRowCount: number;
  range: import('./cell-range').CellRange | null;
  rangeStats: import('./cell-range').RangeStats;
  /** Marker to retain TRow generic for future row-aware extensions. */
  __row?: TRow;
}

export interface StatusBarConfig<TRow> {
  /** Show built-in segments. Defaults to true. */
  defaults?: boolean;
  /** Extra consumer-defined segments appended after defaults. */
  segments?: import('../components/StatusBar').StatusBarSegment[];
  /** Compute segments dynamically each render. Replaces `segments`/`defaults`. */
  getSegments?: (
    ctx: StatusBarContext<TRow>,
  ) => import('../components/StatusBar').StatusBarSegment[];
}
