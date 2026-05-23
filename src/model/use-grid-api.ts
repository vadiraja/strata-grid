import { useMemo } from 'react';
import type { Row, Table } from '@tanstack/react-table';
import type { UseSelectionReturn } from './use-selection';
import type { EditStateReturn } from './use-edit-state';
import type {
  ChangeSet,
  Command,
  UseTreeEditorReturn,
} from '../tree-editor';
import type { ExportOptions } from '../export/types';
import type { WhereUsedResult } from '../data/types';
import type { ViewState } from './view-state-types';

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
  addNode(parentId: string | null, node?: TRow, index?: number): string | null;
  deleteNode(nodeId: string): void;
  deleteNodes(nodeIds: string[]): void;
  moveNode(nodeId: string, newParentId: string | null, index?: number): void;
  indentNode(nodeId: string): void;
  outdentNode(nodeId: string): void;
  moveUp(nodeId: string): void;
  moveDown(nodeId: string): void;
  cut(nodeIds?: string[]): void;
  copy(nodeIds?: string[]): void;
  paste(targetId?: string | null): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  getUndoStack(): Command<TRow>[];
  getChangeSet(): ChangeSet<TRow>;
  markClean(): void;
  exportData(options: ExportOptions<TRow>): Promise<void>;
  exportViewState(): ViewState;
  importViewState(state: ViewState): void;
  whereUsed(nodeId: string): Promise<WhereUsedResult<TRow>[]>;
}

export interface UseGridApiOptions<TRow> {
  table: Table<TRow>;
  editState: EditStateReturn;
  selection?: UseSelectionReturn;
  treeEditor?: UseTreeEditorReturn<TRow>;
  exportData?: (options: ExportOptions<TRow>) => Promise<void>;
  exportViewState?: () => ViewState;
  importViewState?: (state: ViewState) => void;
  whereUsed?: (nodeId: string) => Promise<WhereUsedResult<TRow>[]>;
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
  treeEditor,
  exportData,
  exportViewState,
  importViewState,
  whereUsed,
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
        return editState.isDirty() || (treeEditor?.isDirty ?? false);
      },
      clearDirtyState() {
        editState.clearDirtyState();
        treeEditor?.markClean();
      },
      addNode(parentId, node, index) {
        if (!treeEditor) return null;
        return treeEditor.addNode(parentId, { data: node, index });
      },
      deleteNode(nodeId) {
        treeEditor?.deleteNode(nodeId);
      },
      deleteNodes(nodeIds) {
        treeEditor?.deleteNodes(nodeIds);
      },
      moveNode(nodeId, newParentId, index) {
        treeEditor?.moveNode(nodeId, newParentId, { index });
      },
      indentNode(nodeId) {
        treeEditor?.indentNode(nodeId);
      },
      outdentNode(nodeId) {
        treeEditor?.outdentNode(nodeId);
      },
      moveUp(nodeId) {
        treeEditor?.moveUp(nodeId);
      },
      moveDown(nodeId) {
        treeEditor?.moveDown(nodeId);
      },
      cut(nodeIds) {
        const id = nodeIds?.[0] ?? [...(selection?.selectedIds ?? [])][0];
        if (id) treeEditor?.cut(id);
      },
      copy(nodeIds) {
        const id = nodeIds?.[0] ?? [...(selection?.selectedIds ?? [])][0];
        if (id) treeEditor?.copy(id);
      },
      paste(targetId = null) {
        treeEditor?.paste(targetId);
      },
      undo() {
        treeEditor?.undo();
      },
      redo() {
        treeEditor?.redo();
      },
      canUndo() {
        return treeEditor?.canUndo ?? false;
      },
      canRedo() {
        return treeEditor?.canRedo ?? false;
      },
      getUndoStack() {
        return treeEditor?.undoStack ?? [];
      },
      getChangeSet() {
        return treeEditor?.getChangeSet() ?? { added: [], deleted: [], moved: [] };
      },
      markClean() {
        treeEditor?.markClean();
      },
      exportData(options) {
        return exportData?.(options) ?? Promise.resolve();
      },
      exportViewState() {
        return (
          exportViewState?.() ?? {
            columnOrder: [],
            columnSizing: {},
            columnPinning: { left: [], right: [] },
            sorting: [],
            filters: [],
            expandedIds: [],
            hiddenColumns: [],
          }
        );
      },
      importViewState(state) {
        importViewState?.(state);
      },
      whereUsed(nodeId) {
        return whereUsed?.(nodeId) ?? Promise.resolve([]);
      },
    }),
    [
      editState,
      selection,
      table,
      treeEditor,
      exportData,
      exportViewState,
      importViewState,
      whereUsed,
    ],
  );
}
