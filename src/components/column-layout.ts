import type { Column } from '@tanstack/react-table';
import type { VirtualItem } from '@tanstack/react-virtual';

export interface ColumnLayout<TRow> {
  leftColumns: Column<TRow, unknown>[];
  centerColumns: Column<TRow, unknown>[];
  rightColumns: Column<TRow, unknown>[];
  leftWidth: number;
  centerWidth: number;
  rightWidth: number;
  totalWidth: number;
  centerVirtualItems: VirtualItem[];
  centerBeforeWidth: number;
  centerAfterWidth: number;
}

export function sumColumnWidths<TRow>(
  columns: Column<TRow, unknown>[],
): number {
  return columns.reduce((sum, column) => sum + column.getSize(), 0);
}

export function getVirtualPadding(
  virtualItems: VirtualItem[],
  totalWidth: number,
) {
  if (virtualItems.length === 0) {
    return { before: 0, after: totalWidth };
  }

  const first = virtualItems[0];
  const last = virtualItems[virtualItems.length - 1];

  return {
    before: first.start,
    after: Math.max(0, totalWidth - last.end),
  };
}

export function getInitialVirtualItems(widths: number[]): VirtualItem[] {
  let offset = 0;

  return widths.map((size, index) => {
    const start = offset;
    const end = start + size;
    offset = end;

    return {
      key: index,
      index,
      start,
      end,
      size,
      lane: 0,
    };
  });
}
