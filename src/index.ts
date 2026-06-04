export { DataGrid } from './components/DataGrid';
export type { DataGridProps } from './components/DataGrid';
export type {
  ColumnDef,
  ColumnGroup,
  AnyColumn,
  CellContext,
  TreeDataConfig,
  SortDirection,
  ColumnSort,
  SortingState,
  FilterType,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  SelectionConfig,
  SelectionState,
  GridTheme,
  Density,
  AggregationConfig,
  ExtendedQuantityConfig,
  AdvancedFilterConfig,
  ExportConfig,
  ColumnManagementConfig,
  EditableConfig,
  EditorContext,
  EditorType,
  ValidationState,
  Validator,
  ValidationResult,
  CellEditEvent,
  CellEditEndEvent,
  CellsChangeEvent,
  CellEditDelta,
  LookupConfig,
  LookupRowApi,
  RowEditEvent,
  RowEditEndEvent,
  AggregateType,
  RowAction,
  RowActionsConfig,
} from './model/types';
export { isColumnGroup } from './model/types';
export { computeFlexWidths } from './model/compute-flex-widths';
export { InMemoryDataSource } from './data/in-memory-data-source';
export type { DataSource } from './data/data-source';
export type { GridApi } from './model/use-grid-api';

// ===== M3: tree editor =====
export {
  useTreeEditor,
  useHistoryManager,
  useChangeTracker,
  useClipboard,
  useDragDrop,
  buildTreeState,
  cloneSubtree,
  calculateDropPosition,
  AddNodeCommand,
  DeleteNodeCommand,
  MoveNodeCommand,
  MoveRejectedError,
  ReorderNodeCommand,
  IndentNodeCommand,
  OutdentNodeCommand,
  InsertSubtreeCommand,
  BatchCommand,
  isDescendant,
  validateCycleAndSelf,
} from './tree-editor';
export type {
  TreeNode,
  TreeState,
  Command,
  MoveValidator,
  MoveValidationResult,
  TreeEditorConfig,
  ChangeSet,
  UseTreeEditorOptions,
  UseTreeEditorReturn,
  UseDragDropOptions,
  UseDragDropReturn,
  DragDropState,
  DropPosition,
  UseClipboardOptions,
  UseClipboardReturn,
  UseChangeTrackerOptions,
  UseChangeTrackerReturn,
  UseHistoryManagerOptions,
  HistoryManagerReturn,
  BuildTreeStateConfig,
  CloneSubtreeOptions,
  CloneSubtreeResult,
  AddNodeOptions,
  DeleteNodeOptions,
  MoveNodeOptions,
  ReorderNodeOptions,
  IndentNodeOptions,
  OutdentNodeOptions,
  InsertSubtreeOptions,
} from './tree-editor';

// ===== M4: scale & enterprise =====

// Data — pagination, server data source, lazy tree, live updates, where-used
export {
  useDataSource,
  useServerDataSource,
  useLazyTree,
  usePagination,
  useLiveUpdates,
  useWhereUsed,
  reconcileChanges,
  buildDataQuery,
  findWhereUsed,
  resolveFilterConfig,
} from './data';
export type {
  UseDataSourceReturn,
  UseServerDataSourceReturn,
  UseLazyTreeReturn,
  UsePaginationOptions,
  UsePaginationReturn,
  UseLiveUpdatesOptions,
  UseLiveUpdatesReturn,
  UseWhereUsedReturn,
  BuildDataQueryParams,
  DataQuery,
  FilterExpression,
  FilterOperator,
  PageParams,
  PageResult,
  DataSourceCapabilities,
  DataChangeEvent,
  DataChangeHandler,
  WhereUsedResult,
  LoadingState,
  ColumnFilterConfig,
  ResolvedColumnFilter,
  SelectOption,
} from './data';

// Filter — quick search and advanced filter builder
export { evaluateFilter, useFilterBuilder, useQuickSearch } from './filter';
export type {
  UseFilterBuilderReturn,
  UseQuickSearchOptions,
  UseQuickSearchReturn,
} from './filter';

// Export — CSV/XLSX
export { CsvWriter, XlsxWriter, useExport } from './export';
export type {
  ExportOptions,
  ExportRow,
  ExportColumn,
  CsvWriterOptions,
  XlsxWriterOptions,
  UseExportConfig,
  UseExportReturn,
} from './export';

// Column management & view state
export { useColumnManagement } from './model/use-column-management';
export type {
  ColumnInfo,
  UseColumnManagementOptions,
  UseColumnManagementReturn,
} from './model/use-column-management';
export { useViewState } from './model/use-view-state';
export type {
  UseViewStateOptions,
  UseViewStateReturn,
} from './model/use-view-state';
export type { ViewState } from './model/view-state-types';

// UI components
export { PaginationBar } from './components/PaginationBar';
export type { PaginationBarProps } from './components/PaginationBar';
export { ExportMenu } from './components/ExportMenu';
export type { ExportMenuProps } from './components/ExportMenu';
export { QuickSearchInput } from './components/QuickSearchInput';
export type { QuickSearchInputProps } from './components/QuickSearchInput';
export { FilterBuilderPanel } from './components/FilterBuilderPanel';
export type { FilterBuilderPanelProps } from './components/FilterBuilderPanel';
export { ColumnManagementPanel } from './components/ColumnManagementPanel';
export type { ColumnManagementPanelProps } from './components/ColumnManagementPanel';
export { WhereUsedDialog } from './components/WhereUsedDialog';
export type { WhereUsedDialogProps } from './components/WhereUsedDialog';
export { LoadingOverlay } from './components/LoadingOverlay';
export type { LoadingOverlayProps } from './components/LoadingOverlay';
export { LoadingRow } from './components/LoadingRow';
export type { LoadingRowProps } from './components/LoadingRow';

// OData adapter
export { ODataDataSource, ODataQueryBuilder } from './adapters/odata';
export type {
  ODataDataSourceConfig,
  ODataAuth,
  ODataCollectionResponse,
  ODataErrorResponse,
} from './adapters/odata';

// ===== M5: theming & icons =====

// Icons
export { StrataIcon } from './icons';
export type { StrataIconName, StrataIconProps, IconOverrides } from './icons';

// Theme composition
export { createTheme } from './themes/create-theme';
export type { ThemeOverrides, ComposedTheme } from './themes/create-theme';

// Print mode
export { usePrintMode } from './virtual/use-print-mode';

// ===== 0.3.0: interactive cell UX =====
export { StatusBar } from './components/StatusBar';
export type { StatusBarProps, StatusBarSegment } from './components/StatusBar';
export { ContextMenu } from './components/ContextMenu';
export type { ContextMenuProps, ContextMenuItem } from './components/ContextMenu';
export type {
  CellRange,
  CellPosition,
  RangeStats,
} from './model/cell-range';
export type {
  CellPositionRef,
  CellRangeRef,
  FillRangeEvent,
  ContextMenuTarget,
  ContextMenuContext,
  ContextMenuConfig,
  StatusBarConfig,
  StatusBarContext,
} from './model/types';

// ===== 0.4.0: live data polish =====
export type { FlashConfig } from './model/types';
export type {
  RowValueSnapshot,
  ChangedCell,
} from './model/cell-flash';
