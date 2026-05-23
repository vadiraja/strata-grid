/**
 * Options for data export.
 */
export interface ExportOptions<TRow = unknown> {
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
  /** Sheet name for xlsx. Default: 'Sheet1'. */
  sheetName?: string;
}

/**
 * A row of export data — column id to formatted string value.
 */
export interface ExportRow {
  [columnId: string]: string;
}

/**
 * Column metadata for export.
 */
export interface ExportColumn {
  id: string;
  header: string;
  width?: number;
}
