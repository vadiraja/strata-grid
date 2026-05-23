import type {
  DataQuery,
  PageParams,
  PageResult,
  DataSourceCapabilities,
  DataChangeHandler,
  WhereUsedResult,
} from './types';

/**
 * Abstraction over the grid's data backend.
 *
 * M1 ships `InMemoryDataSource` (synchronous, client-side).
 * M4 adds optional methods for server-side operations — lazy loading,
 * pagination, live updates, where-used, and export-all.
 *
 * The grid feature-detects capabilities via `capabilities()` and adapts
 * its behavior accordingly. Implementations only need to provide the
 * methods they support.
 */
export interface DataSource<TRow> {
  /**
   * Returns rows. Accepts an optional query for server-side sort/filter.
   * Synchronous for in-memory; async for server-side sources.
   */
  load(query?: DataQuery): TRow[] | Promise<TRow[]>;

  /**
   * Optional. Load children of a specific node (lazy tree).
   * Called when a user expands a node whose children haven't been loaded.
   */
  loadChildren?(parentId: string, query?: DataQuery): Promise<TRow[]>;

  /**
   * Optional. Load a page of flat data.
   * Used when pagination is enabled.
   */
  loadPage?(params: PageParams): Promise<PageResult<TRow>>;

  /**
   * Optional. Subscribe to live data changes.
   * Returns an unsubscribe function.
   */
  subscribe?(onChange: DataChangeHandler<TRow>): () => void;

  /**
   * Optional. Declares which server-side capabilities are supported.
   * The grid calls this at mount to determine behavior.
   */
  capabilities?(): DataSourceCapabilities;

  /**
   * Optional. Export all data bypassing pagination.
   * Used by the export feature when scope is 'all'.
   */
  exportAll?(query?: DataQuery): Promise<TRow[]>;

  /**
   * Optional. Where-used / reverse BOM lookup.
   * Given a node id, returns all parent assemblies that use it.
   */
  whereUsed?(nodeId: string): Promise<WhereUsedResult<TRow>[]>;
}
