import { useMemo } from 'react';
import type { Row, Table } from '@tanstack/react-table';
import type { UseSelectionReturn } from './use-selection';
import type { EditStateReturn } from './use-edit-state';

export interface GridApi<TRow> {
  expandAll(): void;
  collapseAll(): void;
  expandRow(id: string, expanded?: boolean): void;
  scrollToRow(id: string): void;
  getSelectedRows(): TRow[];
  startCellEdit(rowId: string, columnId: string): void;
  commitEdit(): void;
  discardEdit(): void;
  startRowEdit(rowId: string): void;
  commitRowEdit(): void;
  discardRowEdit(): void;
  getDirtyState(): Map<string, Map<string, unknown>>;
  isDirty(): boolean;
  clearDirtyState(): void;
}

export interface UseGridApiOptions<TRow> {
  table: Table<TRow>;
  editState: EditStateReturn;
  selection?: UseSelectionReturn;
}

function flattenRows<TRow>(rows: Row<TRow>[]): Row<TRow>[] {
  return rows.flatMap((row) => [row, ...flattenRows(row.subRows)]);
}

function findRow<TRow>(table: Table<TRow>, rowId: string): Row<TRow> | undefined {
  try {
    return table.getRow(rowId, true);
  } catch {
    return flattenRows(table.getCoreRowModel().rows).find((row) => row.id === rowId);
  }
}

function editableValuesForRow<TRow>(row: Row<TRow>): Map<string, unknown> {
  return new Map(
    row
      .getVisibleCells()
      .filter((cell) => {
        const column = cell.column.columnDef.meta?.strataColumn;
        if (!column?.editable) return false;
        return typeof column.editable === 'function'
          ? column.editable(row.original)
          : column.editable;
      })
      .map((cell) => [cell.column.id, cell.getValue()]),
  );
}

export function useGridApi<TRow>({
  table,
  editState,
  selection,
}: UseGridApiOptions<TRow>): GridApi<TRow> {
  return useMemo(
    () => ({
      expandAll() {
        table.toggleAllRowsExpanded(true);
      },
      collapseAll() {
        table.toggleAllRowsExpanded(false);
      },
      expandRow(id, expanded) {
        findRow(table, id)?.toggleExpanded(expanded);
      },
      scrollToRow(_id) {
        // Virtual scrolling owns DOM position; this placeholder keeps the
        // public API stable until row-index scrolling is exposed.
      },
      getSelectedRows() {
        if (!selection) return [];
        return flattenRows(table.getCoreRowModel().rows)
          .filter((row) => selection.selectedIds.has(row.id))
          .map((row) => row.original);
      },
      startCellEdit(rowId, columnId) {
        const row = findRow(table, rowId);
        if (!row || row.getIsGrouped()) return;

        const cell = row
          .getVisibleCells()
          .find((visibleCell) => visibleCell.column.id === columnId);
        if (!cell) return;

        const column = cell.column.columnDef.meta?.strataColumn;
        if (!column?.editable) return;
        const editable =
          typeof column.editable === 'function'
            ? column.editable(row.original)
            : column.editable;
        if (!editable) return;

        editState.startEdit(row.id, columnId, cell.getValue());
      },
      commitEdit() {
        editState.commitEdit();
      },
      discardEdit() {
        editState.discardEdit();
      },
      startRowEdit(rowId) {
        const row = findRow(table, rowId);
        if (!row || row.getIsGrouped()) return;

        const values = editableValuesForRow(row);
        if (values.size === 0) return;
        editState.startRowEdit(row.id, values);
      },
      commitRowEdit() {
        editState.commitRowEdit();
      },
      discardRowEdit() {
        editState.discardRowEdit();
      },
      getDirtyState() {
        return editState.getDirtyState();
      },
      isDirty() {
        return editState.isDirty();
      },
      clearDirtyState() {
        editState.clearDirtyState();
      },
    }),
    [editState, selection, table],
  );
}
