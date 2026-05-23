import type { DataSource } from './data-source';
import type { DataSourceCapabilities, DataChangeHandler, DataChangeEvent } from './types';

/** A {@link DataSource} backed by an in-memory array of rows. */
export class InMemoryDataSource<TRow> implements DataSource<TRow> {
  private rows: TRow[];
  private readonly listeners = new Set<DataChangeHandler<TRow>>();

  constructor(rows: TRow[]) {
    this.rows = rows;
  }

  /** Returns the current rows. Query parameter is ignored (client-side). */
  load(): TRow[] {
    return this.rows;
  }

  /** Replaces the backing rows and notifies all subscribers. */
  setRows(rows: TRow[]): void {
    this.rows = rows;
    const event: DataChangeEvent<TRow> = { type: 'refresh' };
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /** Registers a change listener. Returns an unsubscribe function. */
  subscribe(onChange: DataChangeHandler<TRow>): () => void {
    this.listeners.add(onChange);
    return () => {
      this.listeners.delete(onChange);
    };
  }

  /** InMemoryDataSource is fully client-side — no server capabilities. */
  capabilities(): DataSourceCapabilities {
    return {};
  }
}
