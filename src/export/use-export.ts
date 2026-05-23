import { useCallback } from 'react';
import { CsvWriter } from './csv-writer';
import { XlsxWriter } from './xlsx-writer';
import type { ExportOptions, ExportColumn, ExportRow } from './types';

export interface UseExportConfig<TRow> {
  /** Get currently visible (filtered/sorted) rows. */
  getVisibleRows: () => TRow[];
  /** Get all rows (may call dataSource.exportAll). */
  getAllRows: () => TRow[] | Promise<TRow[]>;
  /** Get selected rows. */
  getSelectedRows: () => TRow[];
  /** Column definitions for export. */
  columns: ExportColumn[];
  /** Read a cell value as a string. */
  getRowValue: (row: TRow, columnId: string) => string;
}

export interface UseExportReturn {
  /** Trigger a data export. */
  exportData: (options: ExportOptions) => Promise<void>;
}

/**
 * Hook providing data export functionality.
 * Supports CSV and Excel formats with configurable scope and formatting.
 */
export function useExport<TRow>(config: UseExportConfig<TRow>): UseExportReturn {
  const { getVisibleRows, getAllRows, getSelectedRows, columns, getRowValue } = config;

  const exportData = useCallback(
    async (options: ExportOptions) => {
      const { format, scope, filename, columns: colFilter, sheetName } = options;

      // Determine which rows to export
      let rows: TRow[];
      switch (scope) {
        case 'selected':
          rows = getSelectedRows();
          break;
        case 'all': {
          const allRows = getAllRows();
          rows = allRows instanceof Promise ? await allRows : allRows;
          break;
        }
        case 'visible':
        default:
          rows = getVisibleRows();
      }

      // Filter columns if specified
      const exportColumns = colFilter
        ? columns.filter((c) => colFilter.includes(c.id))
        : columns;

      // Build export rows
      const exportRows: ExportRow[] = rows.map((row) => {
        const exportRow: ExportRow = {};
        for (const col of exportColumns) {
          const formatter = options.formatters?.[col.id];
          exportRow[col.id] = formatter
            ? formatter(getRowValue(row, col.id), row)
            : getRowValue(row, col.id);
        }
        return exportRow;
      });

      // Generate file
      const defaultFilename = filename ?? 'export';

      if (format === 'csv') {
        const writer = new CsvWriter(exportColumns);
        for (const row of exportRows) {
          writer.addRow(row);
        }
        const blob = writer.toBlob();
        downloadBlob(blob, `${defaultFilename}.csv`);
      } else if (format === 'xlsx') {
        const writer = new XlsxWriter(exportColumns, { sheetName });
        for (const row of exportRows) {
          writer.addRow(row);
        }
        const blob = await writer.toBlob();
        downloadBlob(blob, `${defaultFilename}.xlsx`);
      }
    },
    [getVisibleRows, getAllRows, getSelectedRows, columns, getRowValue],
  );

  return { exportData };
}

/** Trigger a file download in the browser. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  a.click();
  URL.revokeObjectURL(url);
}
