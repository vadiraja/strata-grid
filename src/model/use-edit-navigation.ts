import type { ColumnDef } from './types';

export interface EditNavigationCell<TRow> {
  rowId: string;
  row: TRow;
  columnId: string;
  value: unknown;
}

export interface EditNavigationGrid<TRow> {
  rows: Array<{
    id: string;
    original: TRow;
    getIsGrouped?: () => boolean;
    cells: Array<{
      columnId: string;
      value: unknown;
      column: ColumnDef<TRow>;
    }>;
  }>;
  columnIds: string[];
}

export type EditNavigationDirection = 'next' | 'previous' | 'down';

function isEditable<TRow>(column: ColumnDef<TRow>, row: TRow): boolean {
  if (!column.editable) return false;
  return typeof column.editable === 'function'
    ? column.editable(row)
    : column.editable;
}

function findEditableCell<TRow>(
  grid: EditNavigationGrid<TRow>,
  rowIndex: number,
  columnIndex: number,
): EditNavigationCell<TRow> | null {
  const row = grid.rows[rowIndex];
  const columnId = grid.columnIds[columnIndex];
  if (!row || !columnId || row.getIsGrouped?.()) return null;

  const cell = row.cells.find((candidate) => candidate.columnId === columnId);
  if (!cell || !isEditable(cell.column, row.original)) return null;

  return {
    rowId: row.id,
    row: row.original,
    columnId,
    value: cell.value,
  };
}

export function resolveEditableNavigationTarget<TRow>(
  grid: EditNavigationGrid<TRow>,
  active: { rowId: string; columnId: string },
  direction: EditNavigationDirection,
): EditNavigationCell<TRow> | null {
  const rowIndex = grid.rows.findIndex((row) => row.id === active.rowId);
  const columnIndex = grid.columnIds.indexOf(active.columnId);
  if (rowIndex < 0 || columnIndex < 0) return null;

  if (direction === 'down') {
    for (let nextRow = rowIndex + 1; nextRow < grid.rows.length; nextRow += 1) {
      const target = findEditableCell(grid, nextRow, columnIndex);
      if (target) return target;
    }
    return null;
  }

  const step = direction === 'next' ? 1 : -1;
  let nextRow = rowIndex;
  let nextColumn = columnIndex + step;

  while (nextRow >= 0 && nextRow < grid.rows.length) {
    while (nextColumn >= 0 && nextColumn < grid.columnIds.length) {
      const target = findEditableCell(grid, nextRow, nextColumn);
      if (target) return target;
      nextColumn += step;
    }

    nextRow += step;
    nextColumn = direction === 'next' ? 0 : grid.columnIds.length - 1;
  }

  return null;
}
