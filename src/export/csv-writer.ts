import type { ExportColumn, ExportRow } from './types';

export interface CsvWriterOptions {
  /** Include UTF-8 BOM for Excel compatibility. Default: true. */
  bom?: boolean;
  /** Field delimiter. Default: ','. */
  delimiter?: string;
}

/**
 * Generates RFC 4180-compliant CSV with proper quoting and escaping.
 * Includes BOM by default for Excel compatibility.
 */
export class CsvWriter {
  private readonly columns: ExportColumn[];
  private readonly rows: ExportRow[] = [];
  private readonly delimiter: string;
  private readonly bom: boolean;

  constructor(columns: ExportColumn[], options: CsvWriterOptions = {}) {
    this.columns = columns;
    this.delimiter = options.delimiter ?? ',';
    this.bom = options.bom ?? true;
  }

  /** Add a data row. */
  addRow(row: ExportRow): void {
    this.rows.push(row);
  }

  /** Generate the CSV string. */
  toString(): string {
    const lines: string[] = [];

    // Header row
    lines.push(this.columns.map((col) => this.escape(col.header)).join(this.delimiter));

    // Data rows
    for (const row of this.rows) {
      const values = this.columns.map((col) => this.escape(row[col.id] ?? ''));
      lines.push(values.join(this.delimiter));
    }

    const csv = lines.join('\r\n');
    return this.bom ? `\uFEFF${csv}` : csv;
  }

  /** Generate a Blob for download. */
  toBlob(): Blob {
    return new Blob([this.toString()], { type: 'text/csv;charset=utf-8' });
  }

  /** Escape a value for CSV: quote if it contains delimiter, quotes, or newlines. */
  private escape(value: string): string {
    if (
      value.includes(this.delimiter) ||
      value.includes('"') ||
      value.includes('\n') ||
      value.includes('\r')
    ) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
