import type { ExportColumn, ExportRow } from './types';

export interface XlsxWriterOptions {
  /** Sheet name. Default: 'Sheet1'. */
  sheetName?: string;
}

/** Minimal interface for the exceljs module (avoids hard type dependency). */
interface ExcelJSModule {
  Workbook: new () => ExcelWorkbook;
}

interface ExcelWorkbook {
  addWorksheet(name: string): ExcelWorksheet;
  xlsx: { writeBuffer(): Promise<ArrayBuffer> };
}

interface ExcelWorksheet {
  columns: { header: string; key: string; width: number }[];
  getRow(index: number): { font: { bold: boolean } };
  addRow(values: Record<string, string>): void;
}

/**
 * Generates Excel (xlsx) files using exceljs.
 * exceljs is an optional peer dependency — import fails gracefully
 * with a helpful error message if not installed.
 */
export class XlsxWriter {
  private readonly columns: ExportColumn[];
  private readonly rows: ExportRow[] = [];
  private readonly sheetName: string;

  constructor(columns: ExportColumn[], options: XlsxWriterOptions = {}) {
    this.columns = columns;
    this.sheetName = options.sheetName ?? 'Sheet1';
  }

  /** Add a data row. */
  addRow(row: ExportRow): void {
    this.rows.push(row);
  }

  /** Generate the xlsx as an ArrayBuffer. */
  async toBuffer(): Promise<ArrayBuffer> {
    const ExcelJS = await this.loadExcelJS();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(this.sheetName);

    // Set columns
    sheet.columns = this.columns.map((col) => ({
      header: col.header,
      key: col.id,
      width: col.width ?? 15,
    }));

    // Bold header row
    sheet.getRow(1).font = { bold: true };

    // Add data rows
    for (const row of this.rows) {
      const values: Record<string, string> = {};
      for (const col of this.columns) {
        values[col.id] = row[col.id] ?? '';
      }
      sheet.addRow(values);
    }

    return await workbook.xlsx.writeBuffer();
  }

  /** Generate a Blob for download. */
  async toBlob(): Promise<Blob> {
    const buffer = await this.toBuffer();
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  /** Dynamically import exceljs — throws a helpful error if not installed. */
  private async loadExcelJS(): Promise<ExcelJSModule> {
    try {
      // Use a variable to prevent Vite's static import analysis from failing
      // when exceljs is not installed (it's an optional peer dependency)
      const moduleName = 'exceljs';
      const mod: unknown = await import(/* @vite-ignore */ moduleName);
      const resolved = mod as { default?: ExcelJSModule } & ExcelJSModule;
      return resolved.default ?? resolved;
    } catch {
      throw new Error(
        'Excel export requires the "exceljs" package. ' +
          'Install it with: npm install exceljs',
      );
    }
  }
}
