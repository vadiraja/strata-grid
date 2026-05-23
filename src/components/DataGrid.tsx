import { useEffect, useMemo } from 'react';
import type {
  AnyColumn,
  AggregationConfig,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  ColumnSort,
  EditableConfig,
  GridTheme,
  SelectionConfig,
  SelectionState,
  TreeDataConfig,
} from '../model/types';
import { DEFAULT_GRID_HEIGHT } from '../model/constants';
import { useGridTable } from '../model/use-grid-table';
import { normalizeTreeData } from '../model/normalize-tree-data';
import { resolveTreeColumnId } from '../model/resolve-tree-column-id';
import { useSelection } from '../model/use-selection';
import { getLeafColumns, normalizeColumns } from '../model/normalize-columns';
import { InMemoryDataSource } from '../data/in-memory-data-source';
import { useEditState } from '../model/use-edit-state';
import { EditContext } from '../model/edit-context';
import { useBomRollup } from '../model/use-bom-rollup';
import { useGridApi, type GridApi } from '../model/use-grid-api';
import {
  buildTreeState,
  useDragDrop,
  useTreeEditor,
  type ChangeSet,
  type TreeEditorConfig,
  type TreeState,
} from '../tree-editor';
import { GridRoot } from './GridRoot';

export interface DataGridProps<TRow> {
  /** The rows to display. */
  data: TRow[];
  /** The column definitions. */
  columns: AnyColumn<TRow>[];
  /** Height of the scrollable body area in pixels. Defaults to 400. */
  height?: number;
  /**
   * Turns on tree (hierarchical / BOM) mode. Provide either `getChildren`
   * (nested data) or `getParentId` (flat data).
   */
  treeData?: TreeDataConfig<TRow>;
  /** Tree mode: when true, every row starts expanded. Defaults to false. */
  defaultExpanded?: boolean;
  /** Initial sorting state — an ordered list of column sorts. */
  defaultSort?: ColumnSort[];
  /**
   * Row grouping: column ids to group by, in nesting order.
   * Mutually exclusive with tree mode; when `treeData` is provided, tree wins.
   */
  groupBy?: string[];
  /** Controlled column order. */
  columnOrder?: ColumnOrderState;
  /** Initial uncontrolled column order. Defaults to the `columns` order. */
  defaultColumnOrder?: ColumnOrderState;
  /** Called when drag-to-reorder changes the column order. */
  onColumnOrderChange?: (state: ColumnOrderState) => void;
  /** Controlled column pinning. */
  columnPinning?: ColumnPinningState;
  /** Initial uncontrolled column pinning. Defaults to each column's `pin` field. */
  defaultColumnPinning?: ColumnPinningState;
  /** Called when column pinning changes. */
  onColumnPinningChange?: (state: ColumnPinningState) => void;
  /** Controlled column widths keyed by column id. */
  columnSizing?: ColumnSizingState;
  /** Initial uncontrolled column widths keyed by column id. */
  defaultColumnSizing?: ColumnSizingState;
  /** Called when column resize changes column widths. */
  onColumnSizingChange?: (state: ColumnSizingState) => void;
  /** Enables row selection. */
  selection?: SelectionConfig;
  /** Called when row selection changes. */
  onSelectionChange?: (state: SelectionState) => void;
  /** Visual theme. Defaults to light. */
  theme?: GridTheme;
  /** Enables cell editing. Omit to keep the grid read-only. */
  editable?: EditableConfig;
  /** Imperative grid API ref. */
  apiRef?: { current: GridApi<TRow> | null };
  /** Enables tree structure editing (add/delete/move/reparent). */
  treeEditor?: TreeEditorConfig<TRow>;
  /** Called when the tree editor state changes. */
  onTreeChange?: (state: TreeState<TRow>, changeSet: ChangeSet<TRow>) => void;
  /** Configures aggregate rendering for grouped rows and the footer. */
  aggregation?: AggregationConfig;
  /** Called when a cell edit starts. */
  onCellEditStart?: (event: { rowId: string; columnId: string; value: unknown }) => void;
  /** Called when a cell edit ends. */
  onCellEditEnd?: (event: {
    rowId: string;
    columnId: string;
    value: unknown;
    newValue: unknown;
    committed: boolean;
  }) => void;
  /** Called when a row edit starts. */
  onRowEditStart?: (event: { rowId: string }) => void;
  /** Called when a row edit ends. */
  onRowEditEnd?: (event: {
    rowId: string;
    changes: Record<string, { oldValue: unknown; newValue: unknown }>;
    committed: boolean;
  }) => void;
}

function collectAllRowIds<TRow>(
  rows: TRow[],
  getRowId: (row: TRow, index: number) => string,
  getSubRows?: (row: TRow) => TRow[] | undefined,
): string[] {
  const ids: string[] = [];

  const visit = (items: TRow[]) => {
    items.forEach((row, index) => {
      ids.push(getRowId(row, index));
      const children = getSubRows?.(row);
      if (children) visit(children);
    });
  };

  visit(rows);
  return ids;
}

function buildSelectionMaps<TRow>(
  rows: TRow[],
  getRowId: (row: TRow, index: number) => string,
  getSubRows?: (row: TRow) => TRow[] | undefined,
) {
  const childMap = new Map<string, string[]>();
  const parentMap = new Map<string, string | null>();

  const visit = (items: TRow[], parentId: string | null) => {
    items.forEach((row, index) => {
      const rowId = getRowId(row, index);
      parentMap.set(rowId, parentId);

      const children = getSubRows?.(row) ?? [];
      childMap.set(
        rowId,
        children.map((child, childIndex) => getRowId(child, childIndex)),
      );
      visit(children, rowId);
    });
  };

  visit(rows, null);
  return { childMap, parentMap };
}

function treeStateToRows<TRow>(
  state: TreeState<TRow>,
  getRowId: (row: TRow) => string,
) {
  const rowById = new Map<string, TRow>();
  for (const [id, node] of state.nodes) {
    rowById.set(id, node.data);
  }

  return {
    rootRows: state.rootIds
      .map((id) => rowById.get(id))
      .filter((row): row is TRow => row !== undefined),
    getSubRows: (row: TRow) => {
      const id = getRowId(row);
      const childIds = state.nodes.get(id)?.childIds ?? [];
      const children = childIds
        .map((childId) => rowById.get(childId))
        .filter((child): child is TRow => child !== undefined);
      return children.length > 0 ? children : undefined;
    },
  };
}

/** The public Strata grid component. */
export function DataGrid<TRow>({
  data,
  columns,
  height = DEFAULT_GRID_HEIGHT,
  treeData,
  defaultExpanded,
  defaultSort,
  groupBy,
  columnOrder,
  defaultColumnOrder,
  onColumnOrderChange,
  columnPinning,
  defaultColumnPinning,
  onColumnPinningChange,
  columnSizing,
  defaultColumnSizing,
  onColumnSizingChange,
  selection,
  onSelectionChange,
  theme,
  editable,
  apiRef,
  treeEditor,
  onTreeChange,
  aggregation,
  onCellEditStart,
  onCellEditEnd,
  onRowEditStart,
  onRowEditEnd,
}: DataGridProps<TRow>) {
  const dataSource = useMemo(() => new InMemoryDataSource(data), [data]);
  const rows = dataSource.load();
  const leafColumns = useMemo(() => getLeafColumns(columns), [columns]);
  const tanstackColumns = useMemo(() => normalizeColumns(columns), [columns]);

  const tree = useMemo(
    () => (treeData ? normalizeTreeData(rows, treeData) : null),
    [rows, treeData],
  );
  const treeEditingEnabled = treeData !== undefined && treeEditor !== undefined;
  const initialTreeState = useMemo(
    () =>
      treeData
        ? buildTreeState(rows, {
            getRowId: treeData.getRowId,
            getChildren: treeData.getChildren,
            getParentId: treeData.getParentId,
          })
        : buildTreeState<TRow>([], { getRowId: (_row) => '' }),
    [rows, treeData],
  );
  const treeEditorApi = useTreeEditor({
    initialState: initialTreeState,
    validateMove: treeEditor?.validateMove,
    generateId: treeEditor?.generateId,
    createNode: treeEditor?.createNode,
    historyDepth: treeEditor?.historyDepth,
    onTreeChange: treeEditingEnabled ? onTreeChange : undefined,
  });
  const dragDrop = useDragDrop({
    state: treeEditorApi.state,
    execute: treeEditorApi.execute,
    validators: treeEditor?.validateMove ? [treeEditor.validateMove] : [],
  });
  const editedTree = useMemo(
    () =>
      treeData && treeEditingEnabled
        ? treeStateToRows(treeEditorApi.state, treeData.getRowId)
        : null,
    [treeData, treeEditingEnabled, treeEditorApi.state],
  );

  const treeColumnId = useMemo(
    () => (treeData ? resolveTreeColumnId(leafColumns) : undefined),
    [treeData, leafColumns],
  );
  const effectiveGroupBy = treeData ? undefined : groupBy;
  const bomRollup = useBomRollup({
    roots: editedTree?.rootRows ?? tree?.rootRows ?? [],
    columns: leafColumns,
    sourceColumnId: aggregation?.extendedQuantity?.sourceColumn,
    targetColumnId: aggregation?.extendedQuantity?.targetColumn,
    getRowId: treeData ? (row: TRow) => treeData.getRowId(row) : undefined,
    getSubRows: editedTree?.getSubRows ?? tree?.getSubRows,
    compute: aggregation?.extendedQuantity?.compute,
  });

  const table = useGridTable({
    data: editedTree?.rootRows ?? (tree ? tree.rootRows : rows),
    columns: leafColumns,
    tanstackColumns,
    getSubRows: editedTree?.getSubRows ?? tree?.getSubRows,
    getRowId: treeData ? (row: TRow) => treeData.getRowId(row) : undefined,
    defaultExpanded,
    defaultSort,
    isTreeMode: treeData !== undefined,
    groupBy: effectiveGroupBy,
    columnOrder,
    defaultColumnOrder,
    onColumnOrderChange,
    columnPinning,
    defaultColumnPinning,
    onColumnPinningChange,
    columnSizing,
    defaultColumnSizing,
    onColumnSizingChange,
  });

  const selectableRows = editedTree?.rootRows ?? (tree ? tree.rootRows : rows);
  const getSelectionRowId = useMemo(
    () =>
      treeData
        ? (row: TRow) => treeData.getRowId(row)
        : (_row: TRow, index: number) => String(index),
    [treeData],
  );
  const selectionMaps = useMemo(
    () =>
      buildSelectionMaps(
        selectableRows,
        getSelectionRowId,
        editedTree?.getSubRows ?? tree?.getSubRows,
      ),
    [getSelectionRowId, selectableRows, tree, editedTree],
  );
  const allRowIds = useMemo(
    () =>
      selection
        ? collectAllRowIds(
            selectableRows,
            getSelectionRowId,
            editedTree?.getSubRows ?? tree?.getSubRows,
          )
        : [],
    [getSelectionRowId, selectableRows, selection, tree, editedTree],
  );
  const selectionState = useSelection({
    config: selection ?? { mode: 'multi' },
    allRowIds,
    getSubRowIds: (rowId) => selectionMaps.childMap.get(rowId) ?? [],
    getParentId: (rowId) => selectionMaps.parentMap.get(rowId) ?? null,
    onSelectionChange,
  });

  const editState = useEditState({
    mode: editable?.mode ?? 'cell',
    onCellEditStart,
    onCellEditEnd,
    onRowEditStart,
    onRowEditEnd,
  });
  const gridApi = useGridApi({
    table,
    editState,
    selection: selection ? selectionState : undefined,
    treeEditor: treeEditingEnabled ? treeEditorApi : undefined,
  });

  useEffect(() => {
    if (!apiRef) return undefined;
    apiRef.current = gridApi;
    return () => {
      if (apiRef.current === gridApi) {
        apiRef.current = null;
      }
    };
  }, [apiRef, gridApi]);

  const gridContent = (
    <GridRoot
      table={table}
      height={height}
      treeColumnId={treeColumnId}
      selection={selection ? selectionState : undefined}
      theme={theme}
      columns={leafColumns}
      aggregation={aggregation}
      bomRollup={bomRollup}
      treeEditor={treeEditingEnabled ? treeEditorApi : undefined}
      dragDrop={
        treeEditingEnabled && treeEditor?.enableDrag !== false
          ? dragDrop
          : undefined
      }
      enableTreeKeyboard={
        treeEditingEnabled && treeEditor?.enableIndent !== false
      }
    />
  );

  return editable ? (
    <EditContext.Provider value={{ editState, config: editable }}>
      {gridContent}
    </EditContext.Provider>
  ) : (
    gridContent
  );
}
