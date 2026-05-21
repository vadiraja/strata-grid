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
   * The filter type for this column. Set to `'text'` for case-insensitive
   * substring matching, `'number'` for numeric comparison, or `false` to
   * disable filtering. Defaults to `false` (no filter).
   */
  filter?: FilterType | false;
  /**
   * Pins (freezes) this column to the left or right edge of the grid.
   * Pinned columns are always visible and never column-virtualized.
   * Defaults to unpinned (center).
   */
  pin?: 'left' | 'right';
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
