# Strata M4 · Plan 6 — CSV & Excel Export · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add data export to CSV and Excel (xlsx) formats. Export respects current sort/filter/grouping. Supports exporting visible rows, all data, or selected rows. CSV is built-in with zero dependencies; Excel uses `exceljs` as an optional peer dependency.

**Architecture:** A `useExport` hook provides the `exportData(options)` method. A `CsvWriter` class handles CSV generation with proper quoting, escaping, and BOM for Excel compatibility. An `XlsxWriter` class wraps `exceljs` for Excel output with column widths and tree indentation. An `ExportMenu` component provides the UI trigger.

**Tech Stack:** TypeScript, React 18/19, Vitest, exceljs (optional peer dep).

**Spec:** `docs/superpowers/specs/2026-05-23-strata-m4-scale-enterprise-design.md` (§3.6, §5.1).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/export/csv-writer.ts` | create | CSV generation with quoting/escaping |
| `src/export/csv-writer.test.ts` | create | CSV writer unit tests |
| `src/export/xlsx-writer.ts` | create | Excel generation via exceljs |
| `src/export/xlsx-writer.test.ts` | create | Excel writer unit tests |
| `src/export/use-export.ts` | create | Export orchestration hook |
| `src/export/use-export.test.ts` | create | Export hook tests |
| `src/export/types.ts` | create | Export option types |
| `src/export/index.ts` | create | Barrel export |
| `src/components/ExportMenu.tsx` | create | Export format selection UI |
| `src/components/ExportMenu.test.tsx` | create | ExportMenu component tests |

---

## Task 1: Export types

**Files:**
- Create: `src/export/types.ts`

- [ ] **Step 1: Create `src/export/types.ts`**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/export/types.ts
git commit -m "feat(m4): add export types"
```

---

## Task 2: CSV writer

A zero-dependency CSV generator that handles quoting, escaping, newlines in values, and BOM for Excel compatibility.

**Files:**
- Create: `src/export/csv-writer.ts`
- Create: `src/export/csv-writer.test.ts`

- [ ] **Step 1: Write failing tests — `src/export/csv-writer.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { CsvWriter } from './csv-writer';
import type { ExportColumn } from './types';

const columns: ExportColumn[] = [
  { id: 'name', header: 'Name' },
  { id: 'age', header: 'Age' },
  { id: 'city', header: 'City' },
];

describe('CsvWriter', () => {
  it('generates header row', () => {
    const writer = new CsvWriter(columns);
    writer.addRow({ name: 'Alice', age: '30', city: 'NYC' });
    const csv = writer.toString();
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Name,Age,City');
  });

  it('generates data rows', () => {
    const writer = new CsvWriter(columns);
    writer.addRow({ name: 'Alice', age: '30', city: 'NYC' });
    writer.addRow({ name: 'Bob', age: '25', city: 'LA' });
    const csv = writer.toString();
    const lines = csv.split('\r\n');
    expect(lines[1]).toBe('Alice,30,NYC');
    expect(lines[2]).toBe('Bob,25,LA');
  });

  it('quotes values containing commas', () => {
    const writer = new CsvWriter(columns);
    writer.addRow({ name: 'Smith, John', age: '40', city: 'SF' });
    const csv = writer.toString();
    expect(csv).toContain('"Smith, John"');
  });

  it('escapes double quotes by doubling them', () => {
    const writer = new CsvWriter(columns);
    writer.addRow({ name: 'She said "hello"', age: '28', city: 'Boston' });
    const csv = writer.toString();
    expect(csv).toContain('"She said ""hello"""');
  });

  it('quotes values containing newlines', () => {
    const writer = new CsvWriter(columns);
    writer.addRow({ name: 'Line1\nLine2', age: '33', city: 'Denver' });
    const csv = writer.toString();
    expect(csv).toContain('"Line1\nLine2"');
  });

  it('handles empty values', () => {
    const writer = new CsvWriter(columns);
    writer.addRow({ name: 'Alice', age: '', city: '' });
    const csv = writer.toString();
    const lines = csv.split('\r\n');
    expect(lines[1]).toBe('Alice,,');
  });

  it('includes BOM when configured', () => {
    const writer = new CsvWriter(columns, { bom: true });
    writer.addRow({ name: 'Alice', age: '30', city: 'NYC' });
    const csv = writer.toString();
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('toBlob returns a Blob with correct MIME type', () => {
    const writer = new CsvWriter(columns);
    writer.addRow({ name: 'Alice', age: '30', city: 'NYC' });
    const blob = writer.toBlob();
    expect(blob.type).toBe('text/csv;charset=utf-8');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/export/csv-writer.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/export/csv-writer.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/export/csv-writer.test.ts`
Expected: PASS — all tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/export/csv-writer.ts src/export/csv-writer.test.ts
git commit -m "feat(m4): add CsvWriter with RFC 4180 compliance"
```

---

## Task 3: Excel writer

Wraps `exceljs` for xlsx generation. Handles column widths, tree indentation, and basic formatting.

**Files:**
- Create: `src/export/xlsx-writer.ts`
- Create: `src/export/xlsx-writer.test.ts`

- [ ] **Step 1: Write failing tests — `src/export/xlsx-writer.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { XlsxWriter } from './xlsx-writer';
import type { ExportColumn } from './types';

const columns: ExportColumn[] = [
  { id: 'name', header: 'Name', width: 20 },
  { id: 'age', header: 'Age', width: 10 },
];

describe('XlsxWriter', () => {
  it('creates a workbook with the specified sheet name', async () => {
    const writer = new XlsxWriter(columns, { sheetName: 'BOM Data' });
    writer.addRow({ name: 'Alice', age: '30' });
    const buffer = await writer.toBuffer();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('uses default sheet name when not specified', async () => {
    const writer = new XlsxWriter(columns);
    writer.addRow({ name: 'Alice', age: '30' });
    const buffer = await writer.toBuffer();
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('handles multiple rows', async () => {
    const writer = new XlsxWriter(columns);
    writer.addRow({ name: 'Alice', age: '30' });
    writer.addRow({ name: 'Bob', age: '25' });
    writer.addRow({ name: 'Charlie', age: '35' });
    const buffer = await writer.toBuffer();
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('toBlob returns a Blob with xlsx MIME type', async () => {
    const writer = new XlsxWriter(columns);
    writer.addRow({ name: 'Alice', age: '30' });
    const blob = await writer.toBlob();
    expect(blob.type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/export/xlsx-writer.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/export/xlsx-writer.ts`**

```ts
import type { ExportColumn, ExportRow } from './types';

export interface XlsxWriterOptions {
  /** Sheet name. Default: 'Sheet1'. */
  sheetName?: string;
}

/**
 * Generates Excel (xlsx) files using exceljs.
 * exceljs is an optional peer dependency — import fails gracefully
 * if not installed.
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

  /** Generate the xlsx as a Buffer. */
  async toBuffer(): Promise<Buffer> {
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

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  /** Generate a Blob for download. */
  async toBlob(): Promise<Blob> {
    const buffer = await this.toBuffer();
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  /** Dynamically import exceljs — throws a helpful error if not installed. */
  private async loadExcelJS(): Promise<typeof import('exceljs')> {
    try {
      return await import('exceljs');
    } catch {
      throw new Error(
        'Excel export requires the "exceljs" package. ' +
          'Install it with: npm install exceljs',
      );
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/export/xlsx-writer.test.ts`
Expected: PASS (requires `exceljs` installed as a dev dependency for tests).

- [ ] **Step 5: Add exceljs as optional peer dependency in package.json**

```json
"peerDependencies": {
  "exceljs": ">=4.0.0"
},
"peerDependenciesMeta": {
  "exceljs": { "optional": true }
}
```

Also add to devDependencies for testing:
```bash
npm install --save-dev exceljs
```

- [ ] **Step 6: Commit**

```bash
git add src/export/xlsx-writer.ts src/export/xlsx-writer.test.ts package.json
git commit -m "feat(m4): add XlsxWriter with exceljs integration"
```

---

## Task 4: useExport hook

Orchestrates the export process: collects rows based on scope, formats values, and triggers download.

**Files:**
- Create: `src/export/use-export.ts`
- Create: `src/export/use-export.test.ts`

- [ ] **Step 1: Write failing tests — `src/export/use-export.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExport } from './use-export';
import type { ExportColumn } from './types';

// Mock URL.createObjectURL and document.createElement for download
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

interface Row { id: string; name: string; age: number }

const rows: Row[] = [
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
];

const columns: ExportColumn[] = [
  { id: 'name', header: 'Name' },
  { id: 'age', header: 'Age' },
];

describe('useExport', () => {
  it('exports CSV with visible rows', async () => {
    const mockClick = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      click: mockClick,
      href: '',
      download: '',
      style: {},
      remove: vi.fn(),
    } as unknown as HTMLElement);

    const { result } = renderHook(() =>
      useExport({
        getVisibleRows: () => rows,
        getAllRows: () => rows,
        getSelectedRows: () => [],
        columns,
        getRowValue: (row, colId) => String((row as Row)[colId as keyof Row]),
      }),
    );

    await act(async () => {
      await result.current.exportData({ format: 'csv', scope: 'visible' });
    });

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
  });

  it('uses custom filename', async () => {
    const mockAnchor = {
      click: vi.fn(),
      href: '',
      download: '',
      style: {},
      remove: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(
      mockAnchor as unknown as HTMLElement,
    );

    const { result } = renderHook(() =>
      useExport({
        getVisibleRows: () => rows,
        getAllRows: () => rows,
        getSelectedRows: () => [],
        columns,
        getRowValue: (row, colId) => String((row as Row)[colId as keyof Row]),
      }),
    );

    await act(async () => {
      await result.current.exportData({
        format: 'csv',
        scope: 'visible',
        filename: 'my-export',
      });
    });

    expect(mockAnchor.download).toBe('my-export.csv');
  });
});
```

- [ ] **Step 2: Create `src/export/use-export.ts`**

```ts
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
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/export/use-export.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/export/use-export.ts src/export/use-export.test.ts
git commit -m "feat(m4): add useExport hook for CSV/Excel export"
```

---

## Task 5: ExportMenu component and barrel export

**Files:**
- Create: `src/components/ExportMenu.tsx`
- Create: `src/export/index.ts`

- [ ] **Step 1: Create `src/components/ExportMenu.tsx`**

```tsx
import { useState, type FC } from 'react';

export interface ExportMenuProps {
  formats: ('csv' | 'xlsx')[];
  onExport: (format: 'csv' | 'xlsx') => void;
  disabled?: boolean;
}

/**
 * Dropdown menu for selecting export format.
 */
export const ExportMenu: FC<ExportMenuProps> = ({ formats, onExport, disabled }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="strata-export-menu">
      <button
        className="strata-export-btn"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        aria-label="Export data"
        aria-expanded={open}
      >
        Export ▾
      </button>
      {open && (
        <ul className="strata-export-dropdown" role="menu">
          {formats.includes('csv') && (
            <li role="menuitem">
              <button
                onClick={() => { onExport('csv'); setOpen(false); }}
                className="strata-export-option"
              >
                Export as CSV
              </button>
            </li>
          )}
          {formats.includes('xlsx') && (
            <li role="menuitem">
              <button
                onClick={() => { onExport('xlsx'); setOpen(false); }}
                className="strata-export-option"
              >
                Export as Excel
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Create `src/export/index.ts`**

```ts
export type { ExportOptions, ExportRow, ExportColumn } from './types';
export { CsvWriter } from './csv-writer';
export type { CsvWriterOptions } from './csv-writer';
export { XlsxWriter } from './xlsx-writer';
export type { XlsxWriterOptions } from './xlsx-writer';
export { useExport } from './use-export';
export type { UseExportConfig, UseExportReturn } from './use-export';
```

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 4: Commit**

```bash
git add src/export/index.ts src/components/ExportMenu.tsx
git commit -m "feat(m4): add ExportMenu component and export barrel"
```
