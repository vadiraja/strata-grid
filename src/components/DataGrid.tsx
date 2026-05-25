import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ExpandedState,
  SortingState as TanstackSortingState,
} from '@tanstack/react-table';
import type {
  AdvancedFilterConfig,
  AnyColumn,
  AggregationConfig,
  ColumnDef,
  ColumnManagementConfig,
  FillRangeEvent,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  ColumnSort,
  Density,
  EditableConfig,
  ExportConfig,
  GridTheme,
  PaginationConfig,
  RowActionsConfig,
  SelectionConfig,
  SelectionState,
  TreeDataConfig,
  ViewState,
} from '../model/types';
import { RowActionsCell } from './RowActionsCell';
import { useColorScheme } from '../themes/use-color-scheme';
import { resolveTheme } from '../themes/resolve-theme';
import { DEFAULT_GRID_HEIGHT } from '../model/constants';
import { useGridTable } from '../model/use-grid-table';
import { normalizeTreeData } from '../model/normalize-tree-data';
import { resolveTreeColumnId } from '../model/resolve-tree-column-id';
import { useSelection } from '../model/use-selection';
import { getLeafColumns, normalizeColumns } from '../model/normalize-columns';
import { readValue } from '../model/read-value';
import { InMemoryDataSource } from '../data/in-memory-data-source';
import type { DataSource } from '../data/data-source';
import type { DataQuery, FilterExpression } from '../data/types';
import { useLazyTree } from '../data/use-lazy-tree';
import { useServerDataSource } from '../data/use-server-data-source';
import { usePagination } from '../data/use-pagination';
import { useLiveUpdates } from '../data/use-live-updates';
import { findWhereUsed } from '../data/where-used';
import { buildDataQuery } from '../data/build-data-query';
import { useExport } from '../export/use-export';
import type { ExportOptions } from '../export/types';
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
import { LoadingOverlay } from './LoadingOverlay';
import { PaginationBar } from './PaginationBar';
import type { IconOverrides } from '../icons';
import { IconProvider } from '../icons';

/**
 * Props for the `<DataGrid>` component — the single entry point that renders
 * both flat and tree-mode grids. `TRow` is the row data type.
 */
export interface DataGridProps<TRow> {
  /** The rows to display. */
  data: TRow[];
  /** The column definitions. */
  columns: AnyColumn<TRow>[];
  /**
   * Optional external data source with server-side capabilities (lazy loading,
   * pagination, etc.). When provided, the grid uses this instead of creating
   * an InMemoryDataSource from `data`.
   */
  dataSource?: DataSource<TRow>;
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
  /** Visual density. Default: 'standard'. */
  density?: Density;
  /** Alternating row background. Default: false. */
  striped?: boolean;
  /** Smooth CSS transitions on theme/density changes. Default: false. */
  transitions?: boolean;
  /** Icon overrides for the grid's built-in icons. */
  icons?: IconOverrides;
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
  /** Configures pagination behavior. */
  pagination?: PaginationConfig;
  /** Configures advanced filter state and server push-down. */
  advancedFilter?: AdvancedFilterConfig;
  /** Configures grid export defaults. */
  export?: ExportConfig<TRow>;
  /** Enables column management integrations. */
  columnManagement?: boolean | ColumnManagementConfig;
  /** Initial view state to restore after table creation. */
  defaultViewState?: ViewState;
  /** Called when serializable view state changes. */
  onViewStateChange?: (state: ViewState) => void;
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
  /**
   * Called whenever the grid's paginated state changes. Use this to drive a
   * shell-rendered status bar with total count, current page, or loading
   * state — `ViewState` intentionally doesn't include pagination, so this
   * callback is the supported seam.
   */
  onPaginationChange?: (state: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    isLoading: boolean;
    hasMore: boolean;
    error: Error | null;
  }) => void;
  /**
   * Renders a built-in actions column with per-row buttons. Supports inline
   * icon buttons and kebab-menu displays. The column is pinned to the right
   * edge by default; set `pin: false` to leave it unpinned, or `pin: 'left'`
   * to pin it to the left.
   */
  rowActions?: RowActionsConfig<TRow>;
  /** Called when the user completes a fill-handle drag. */
  onFillRange?: (event: FillRangeEvent) => void;
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

function toTanstackSorting(sorts: ColumnSort[] = []): TanstackSortingState {
  return sorts.map((sort) => ({
    id: sort.columnId,
    desc: sort.direction === 'desc',
  }));
}

function fromTanstackSorting(sorts: TanstackSortingState): ColumnSort[] {
  return sorts.map((sort) => ({
    columnId: sort.id,
    direction: sort.desc ? 'desc' : 'asc',
  }));
}

function expandedIdsFromState(expanded: ExpandedState): string[] {
  if (expanded === true) return [];
  return Object.entries(expanded)
    .filter(([, isExpanded]) => isExpanded)
    .map(([id]) => id);
}

function expandedStateFromIds(ids: string[]): ExpandedState {
  return ids.reduce<Record<string, boolean>>((state, id) => {
    state[id] = true;
    return state;
  }, {});
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
  density,
  striped,
  transitions,
  icons,
  editable,
  apiRef,
  treeEditor,
  onTreeChange,
  aggregation,
  pagination,
  advancedFilter,
  export: exportConfig,
  columnManagement: _columnManagement,
  defaultViewState,
  onViewStateChange,
  onCellEditStart,
  onCellEditEnd,
  onRowEditStart,
  onRowEditEnd,
  onPaginationChange,
  rowActions,
  onFillRange,
  dataSource: externalDataSource,
}: DataGridProps<TRow>) {
  // Resolve theme: auto → follows OS preference; literals → data-theme; className strings → className
  const osScheme = useColorScheme();
  const resolved = resolveTheme(theme, osScheme);

  const internalDataSource = useMemo(() => new InMemoryDataSource(data), [data]);
  const dataSource: DataSource<TRow> = externalDataSource ?? internalDataSource;

  // Detect server-side capabilities
  const capabilities = useMemo(
    () => dataSource.capabilities?.() ?? {},
    [dataSource],
  );
  const hasServerCapabilities =
    capabilities.serverSort || capabilities.serverFilter;
  const [serverSort, setServerSort] = useState<ColumnSort[]>(
    defaultViewState?.sorting ?? defaultSort ?? [],
  );
  const [serverFilters, setServerFilters] = useState<FilterExpression[]>(
    defaultViewState?.filters ??
      (advancedFilter?.defaultExpression ? [advancedFilter.defaultExpression] : []),
  );
  const serverQuery = useMemo<DataQuery>(() => {
    const query = buildDataQuery({
      sort: serverSort,
      filters: serverFilters,
    });
    return Object.keys(query).length > 0 ? query : {};
  }, [serverSort, serverFilters]);

  // Server data source hook — always called (hooks can't be conditional)
  const serverDS = useServerDataSource(dataSource);

  // Pagination hook — always called (hooks can't be conditional)
  const paginationState = usePagination(dataSource, {
    pageSize: pagination?.pageSize,
    mode: pagination?.mode,
    query: serverQuery,
  });

  // Surface pagination state to consumers (for status-bar rendering, etc.)
  useEffect(() => {
    if (!onPaginationChange) return;
    onPaginationChange({
      currentPage: paginationState.currentPage,
      pageSize: paginationState.pageSize,
      totalCount: paginationState.totalCount,
      totalPages: paginationState.totalPages,
      isLoading: paginationState.isLoading,
      hasMore: paginationState.hasMore,
      error: paginationState.error,
    });
  }, [
    onPaginationChange,
    paginationState.currentPage,
    paginationState.pageSize,
    paginationState.totalCount,
    paginationState.totalPages,
    paginationState.isLoading,
    paginationState.hasMore,
    paginationState.error,
  ]);

  // Use server-loaded data when server capabilities exist, otherwise load synchronously
  const rows = useMemo(() => {
    if (pagination && 'loadPage' in dataSource && dataSource.loadPage) {
      return paginationState.data;
    }
    if (hasServerCapabilities) {
      return serverDS.data;
    }
    const result = dataSource.load();
    return Array.isArray(result) ? result : [];
  }, [dataSource, hasServerCapabilities, serverDS.data, pagination, paginationState.data]);

  // Live updates — subscribes to data source changes and reconciles them
  const getRowIdForLive = useMemo(
    () => (treeData ? (row: TRow) => treeData.getRowId(row) : (row: TRow) => String((row as Record<string, unknown>).id ?? '')),
    [treeData],
  );
  const liveUpdates = useLiveUpdates(dataSource, rows, getRowIdForLive, {
    onRefreshNeeded: () => serverDS.refresh(),
    getParentId: treeData?.getParentId,
  });
  const effectiveRows = capabilities.liveUpdates ? liveUpdates.data : rows;

  const lazyTree = useLazyTree(dataSource);

  // Inject row-actions column when configured. The synthetic column is
  // appended to the user's columns array and pinned to the configured edge.
  const columnsWithActions = useMemo<AnyColumn<TRow>[]>(() => {
    if (!rowActions?.actions?.length) return columns;
    const visibleActions = rowActions.actions;
    const defaultWidth = Math.max(40, visibleActions.length * 36 + 16);
    const actionsColumn: ColumnDef<TRow> = {
      id: '__strata_actions__',
      header: '',
      width: rowActions.width ?? defaultWidth,
      pin: rowActions.pin === false ? undefined : rowActions.pin ?? 'right',
      sortable: false,
      cell: ({ row }) => <RowActionsCell config={rowActions} row={row} />,
    };
    return [...columns, actionsColumn];
  }, [columns, rowActions]);

  const leafColumns = useMemo(
    () => getLeafColumns(columnsWithActions),
    [columnsWithActions],
  );
  const tanstackColumns = useMemo(
    () => normalizeColumns(columnsWithActions),
    [columnsWithActions],
  );

  const tree = useMemo(
    () => (treeData ? normalizeTreeData(effectiveRows, treeData) : null),
    [effectiveRows, treeData],
  );
  const treeEditingEnabled = treeData !== undefined && treeEditor !== undefined;
  const initialTreeState = useMemo(
    () =>
      treeData
        ? buildTreeState(effectiveRows, {
            getRowId: treeData.getRowId,
            getChildren: treeData.getChildren,
            getParentId: treeData.getParentId,
          })
        : buildTreeState<TRow>([], { getRowId: (_row) => '' }),
    [effectiveRows, treeData],
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
  const lazyTreeEnabled = !!(treeData && capabilities.lazyChildren);
  const canLazyExpand = useCallback(
    (row: TRow) => {
      const hasChildrenHint = (row as Record<string, unknown>).hasChildren;
      if (typeof hasChildrenHint === 'boolean') return hasChildrenHint;
      return !!tree?.getSubRows(row)?.length;
    },
    [tree],
  );
  const lazyGetSubRows = useCallback(
    (row: TRow) => {
      if (!treeData) return undefined;
      const loadedChildren = lazyTree.getChildren(treeData.getRowId(row));
      return loadedChildren ?? tree?.getSubRows(row);
    },
    [lazyTree, tree, treeData],
  );
  const effectiveTreeRows = editedTree?.rootRows ?? (tree ? tree.rootRows : effectiveRows);
  const effectiveGetSubRows =
    editedTree?.getSubRows ?? (lazyTreeEnabled ? lazyGetSubRows : tree?.getSubRows);

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
    getSubRows: effectiveGetSubRows,
    compute: aggregation?.extendedQuantity?.compute,
  });

  const table = useGridTable({
    data: effectiveTreeRows,
    columns: leafColumns,
    tanstackColumns,
    getSubRows: effectiveGetSubRows,
    getRowId: treeData ? (row: TRow) => treeData.getRowId(row) : undefined,
    defaultExpanded,
    defaultSort: defaultViewState?.sorting ?? defaultSort,
    onSortChange: (sort) => {
      setServerSort(sort);
      if (capabilities.serverSort) serverDS.setSort(sort);
    },
    onFilterChange: (filters) => {
      setServerFilters(filters);
      if (capabilities.serverFilter) serverDS.setFilters(filters);
    },
    manualSorting: !!capabilities.serverSort,
    manualFiltering: !!capabilities.serverFilter,
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
    getRowCanExpand: lazyTreeEnabled ? (row) => canLazyExpand(row.original) : undefined,
  });

  const selectableRows = effectiveTreeRows;
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
        effectiveGetSubRows,
      ),
    [effectiveGetSubRows, getSelectionRowId, selectableRows],
  );
  const allRowIds = useMemo(
    () =>
      selection
        ? collectAllRowIds(
            selectableRows,
            getSelectionRowId,
            effectiveGetSubRows,
          )
        : [],
    [effectiveGetSubRows, getSelectionRowId, selectableRows, selection],
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
  const selectedRowsForExport = useCallback(() => {
    if (!selection) return [];
    return table
      .getCoreRowModel()
      .flatRows
      .filter((row) => selectionState.selectedIds.has(row.id))
      .map((row) => row.original);
  }, [selection, selectionState.selectedIds, table]);
  const exportColumns = useMemo(
    () =>
      leafColumns.map((column) => ({
        id: column.id,
        header:
          typeof column.header === 'string' ? column.header : String(column.id),
        width: column.width,
      })),
    [leafColumns],
  );
  const exportApi = useExport<TRow>({
    getVisibleRows: () => table.getRowModel().flatRows.map((row) => row.original),
    getAllRows: () => dataSource.exportAll?.(serverQuery) ?? effectiveRows,
    getSelectedRows: selectedRowsForExport,
    columns: exportColumns,
    getRowValue: (row, columnId) => {
      const column = leafColumns.find((candidate) => candidate.id === columnId);
      const value = column ? readValue(column, row) : undefined;
      return value == null ? '' : String(value);
    },
  });
  const exportData = useCallback(
    (options: ExportOptions<TRow>) =>
      exportApi.exportData({
        filename: exportConfig?.filename,
        formatters: exportConfig?.formatters,
        ...options,
      }),
    [exportApi, exportConfig],
  );
  const exportViewState = useCallback(
    (): ViewState => ({
      columnOrder: table.getState().columnOrder,
      columnSizing: table.getState().columnSizing,
      columnPinning: {
        left: table.getState().columnPinning.left ?? [],
        right: table.getState().columnPinning.right ?? [],
      },
      sorting: fromTanstackSorting(table.getState().sorting),
      filters: serverFilters,
      expandedIds: expandedIdsFromState(table.getState().expanded),
      hiddenColumns: [],
    }),
    [serverFilters, table],
  );
  const importViewState = useCallback(
    (state: ViewState) => {
      table.setColumnOrder(state.columnOrder);
      table.setColumnSizing(state.columnSizing);
      table.setColumnPinning(state.columnPinning);
      table.setSorting(toTanstackSorting(state.sorting));
      table.setExpanded(expandedStateFromIds(state.expandedIds));
      setServerSort(state.sorting);
      setServerFilters(state.filters);
      if (capabilities.serverSort) serverDS.setSort(state.sorting);
      if (capabilities.serverFilter) serverDS.setFilters(state.filters);
    },
    [capabilities.serverFilter, capabilities.serverSort, serverDS, table],
  );
  const whereUsed = useCallback(
    async (nodeId: string) => {
      if (dataSource.whereUsed) return dataSource.whereUsed(nodeId);
      if (!treeData?.getParentId) return [];
      return findWhereUsed(effectiveRows, nodeId, treeData.getRowId, treeData.getParentId);
    },
    [dataSource, effectiveRows, treeData],
  );
  const gridApi = useGridApi<TRow>({
    table,
    editState,
    selection: selection ? selectionState : undefined,
    treeEditor: treeEditingEnabled ? treeEditorApi : undefined,
    exportData,
    exportViewState,
    importViewState,
    whereUsed,
  });

  useEffect(() => {
    if (!defaultViewState) return;
    importViewState(defaultViewState);
    // Only restore the initial state once for this table instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onViewStateChange?.(exportViewState());
  }, [
    onViewStateChange,
    exportViewState,
    table.getState().columnOrder,
    table.getState().columnPinning,
    table.getState().columnSizing,
    table.getState().expanded,
    table.getState().sorting,
  ]);

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
      theme={resolved.dataTheme ?? resolved.className}
      density={density}
      striped={striped}
      transitions={transitions}
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
      lazyTree={dataSource.capabilities?.()?.lazyChildren ? lazyTree : undefined}
      onFillRange={onFillRange}
    />
  );

  // Show loading overlay only for server-side reloads (not initial load)
  const showOverlay = !!(hasServerCapabilities && serverDS.isLoading);

  const paginationBar = pagination && 'loadPage' in dataSource && dataSource.loadPage ? (
    <PaginationBar
      currentPage={paginationState.currentPage}
      totalPages={paginationState.totalPages}
      pageSize={paginationState.pageSize}
      totalCount={paginationState.totalCount}
      pageSizeOptions={pagination.pageSizeOptions}
      mode={pagination.mode}
      hasMore={paginationState.hasMore}
      isLoading={paginationState.isLoading}
      onPageChange={paginationState.goToPage}
      onPageSizeChange={paginationState.setPageSize}
      onLoadMore={paginationState.loadMore}
    />
  ) : null;

  const wrappedContent = hasServerCapabilities ? (
    <div style={{ position: 'relative' }}>
      {gridContent}
      {paginationBar}
      <LoadingOverlay visible={showOverlay} />
    </div>
  ) : paginationBar ? (
    <div>
      {gridContent}
      {paginationBar}
    </div>
  ) : (
    gridContent
  );

  return (
    <IconProvider overrides={icons ?? {}}>
      {editable ? (
        <EditContext.Provider value={{ editState, config: editable }}>
          {wrappedContent}
        </EditContext.Provider>
      ) : (
        wrappedContent
      )}
    </IconProvider>
  );
}
