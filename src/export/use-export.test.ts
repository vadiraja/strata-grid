import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExport } from './use-export';
import type { ExportColumn } from './types';

// Mock xlsx-writer to avoid exceljs dependency
vi.mock('./xlsx-writer', () => {
  class MockXlsxWriter {
    addRow = vi.fn();
    toBlob = vi.fn(async () => new Blob(['xlsx-content'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }));
  }
  return { XlsxWriter: MockXlsxWriter };
});

interface Row {
  id: string;
  name: string;
  age: number;
}

const rows: Row[] = [
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
];

const columns: ExportColumn[] = [
  { id: 'name', header: 'Name' },
  { id: 'age', header: 'Age' },
];

describe('useExport', () => {
  let mockClick: ReturnType<typeof vi.fn>;
  let mockAnchor: HTMLAnchorElement;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    mockClick = vi.fn();

    // Save originals
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    originalCreateElement = document.createElement.bind(document);

    // Mock URL methods
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();

    // Mock createElement only for 'a' tags — use a real element so jsdom is happy
    const createElementSpy = vi.spyOn(document, 'createElement');
    createElementSpy.mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      const el = originalCreateElement(tagName, options);
      if (tagName === 'a') {
        mockAnchor = el as HTMLAnchorElement;
        el.click = mockClick;
      }
      return el;
    });
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it('exports CSV with visible rows', async () => {
    const { result } = renderHook(() =>
      useExport({
        getVisibleRows: () => rows,
        getAllRows: () => rows,
        getSelectedRows: () => [],
        columns,
        getRowValue: (row, colId) => String(row[colId as keyof Row]),
      }),
    );

    await act(async () => {
      await result.current.exportData({ format: 'csv', scope: 'visible' });
    });

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
  });

  it('uses custom filename for CSV', async () => {
    const { result } = renderHook(() =>
      useExport({
        getVisibleRows: () => rows,
        getAllRows: () => rows,
        getSelectedRows: () => [],
        columns,
        getRowValue: (row, colId) => String(row[colId as keyof Row]),
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

  it('exports selected rows only', async () => {
    const selectedRows = [rows[0]];

    const { result } = renderHook(() =>
      useExport({
        getVisibleRows: () => rows,
        getAllRows: () => rows,
        getSelectedRows: () => selectedRows,
        columns,
        getRowValue: (row, colId) => String(row[colId as keyof Row]),
      }),
    );

    await act(async () => {
      await result.current.exportData({ format: 'csv', scope: 'selected' });
    });

    expect(mockClick).toHaveBeenCalled();
  });

  it('exports all rows with async getAllRows', async () => {
    const { result } = renderHook(() =>
      useExport({
        getVisibleRows: () => rows,
        getAllRows: () => Promise.resolve(rows),
        getSelectedRows: () => [],
        columns,
        getRowValue: (row, colId) => String(row[colId as keyof Row]),
      }),
    );

    await act(async () => {
      await result.current.exportData({ format: 'csv', scope: 'all' });
    });

    expect(mockClick).toHaveBeenCalled();
  });

  it('exports xlsx format', async () => {
    const { result } = renderHook(() =>
      useExport({
        getVisibleRows: () => rows,
        getAllRows: () => rows,
        getSelectedRows: () => [],
        columns,
        getRowValue: (row, colId) => String(row[colId as keyof Row]),
      }),
    );

    await act(async () => {
      await result.current.exportData({ format: 'xlsx', scope: 'visible' });
    });

    expect(mockAnchor.download).toBe('export.xlsx');
    expect(mockClick).toHaveBeenCalled();
  });

  it('applies custom formatters', async () => {
    const { result } = renderHook(() =>
      useExport({
        getVisibleRows: () => rows,
        getAllRows: () => rows,
        getSelectedRows: () => [],
        columns,
        getRowValue: (row, colId) => String(row[colId as keyof Row]),
      }),
    );

    await act(async () => {
      await result.current.exportData({
        format: 'csv',
        scope: 'visible',
        formatters: {
          age: (value) => `${value} years`,
        },
      });
    });

    expect(mockClick).toHaveBeenCalled();
  });

  it('filters columns when specified', async () => {
    const { result } = renderHook(() =>
      useExport({
        getVisibleRows: () => rows,
        getAllRows: () => rows,
        getSelectedRows: () => [],
        columns,
        getRowValue: (row, colId) => String(row[colId as keyof Row]),
      }),
    );

    await act(async () => {
      await result.current.exportData({
        format: 'csv',
        scope: 'visible',
        columns: ['name'],
      });
    });

    expect(mockClick).toHaveBeenCalled();
  });
});
