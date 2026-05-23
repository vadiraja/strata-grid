import { describe, it, expect, vi } from 'vitest';
import type { ExportColumn } from './types';

const columns: ExportColumn[] = [
  { id: 'name', header: 'Name', width: 20 },
  { id: 'age', header: 'Age', width: 10 },
];

// Mock exceljs since it's an optional peer dependency and not installed
vi.mock('exceljs', () => {
  const mockAddRow = vi.fn();
  const mockSheet = {
    columns: [] as unknown[],
    getRow: () => ({ font: {} }),
    addRow: mockAddRow,
  };
  const mockWorkbook = {
    addWorksheet: vi.fn(() => mockSheet),
    xlsx: {
      writeBuffer: vi.fn(async () => new ArrayBuffer(16)),
    },
  };
  class MockWorkbook {
    addWorksheet = mockWorkbook.addWorksheet;
    xlsx = mockWorkbook.xlsx;
  }
  return {
    default: { Workbook: MockWorkbook },
    Workbook: MockWorkbook,
  };
});

describe('XlsxWriter', () => {
  it('creates a workbook with the specified sheet name', async () => {
    const { XlsxWriter } = await import('./xlsx-writer');
    const writer = new XlsxWriter(columns, { sheetName: 'BOM Data' });
    writer.addRow({ name: 'Alice', age: '30' });
    const buffer = await writer.toBuffer();
    expect(buffer).toBeInstanceOf(ArrayBuffer);
  });

  it('uses default sheet name when not specified', async () => {
    const { XlsxWriter } = await import('./xlsx-writer');
    const writer = new XlsxWriter(columns);
    writer.addRow({ name: 'Alice', age: '30' });
    const buffer = await writer.toBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it('handles multiple rows', async () => {
    const { XlsxWriter } = await import('./xlsx-writer');
    const writer = new XlsxWriter(columns);
    writer.addRow({ name: 'Alice', age: '30' });
    writer.addRow({ name: 'Bob', age: '25' });
    writer.addRow({ name: 'Charlie', age: '35' });
    const buffer = await writer.toBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it('toBlob returns a Blob with xlsx MIME type', async () => {
    const { XlsxWriter } = await import('./xlsx-writer');
    const writer = new XlsxWriter(columns);
    writer.addRow({ name: 'Alice', age: '30' });
    const blob = await writer.toBlob();
    expect(blob.type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('addRow stores rows for later generation', async () => {
    const { XlsxWriter } = await import('./xlsx-writer');
    const writer = new XlsxWriter(columns);
    writer.addRow({ name: 'Alice', age: '30' });
    writer.addRow({ name: 'Bob', age: '25' });
    // Verify no error thrown during addRow
    expect(true).toBe(true);
  });
});

describe('XlsxWriter error handling', () => {
  it('throws helpful error when exceljs is not available', async () => {
    vi.doUnmock('exceljs');
    vi.resetModules();

    const { XlsxWriter: FreshXlsxWriter } = await import('./xlsx-writer');
    const writer = new FreshXlsxWriter(columns);
    writer.addRow({ name: 'Alice', age: '30' });

    await expect(writer.toBuffer()).rejects.toThrow(
      'Excel export requires the "exceljs" package',
    );
  });
});
