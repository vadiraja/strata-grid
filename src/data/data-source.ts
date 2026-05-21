/**
 * Abstraction over the grid's data backend.
 *
 * M1 ships `InMemoryDataSource`. Later milestones add server-side
 * implementations behind this same interface.
 */
export interface DataSource<TRow> {
  /** Returns all rows. Synchronous for in-memory; may be async for servers. */
  load(): TRow[] | Promise<TRow[]>;
  /**
   * Optional. Registers a listener for external data changes and returns an
   * unsubscribe function.
   */
  subscribe?(onChange: () => void): () => void;
}
