import type { DataSource } from './data-source';

/** A {@link DataSource} backed by an in-memory array of rows. */
export class InMemoryDataSource<TRow> implements DataSource<TRow> {
  private rows: TRow[];
  private readonly listeners = new Set<() => void>();

  constructor(rows: TRow[]) {
    this.rows = rows;
  }

  /** Returns the current rows. */
  load(): TRow[] {
    return this.rows;
  }

  /** Replaces the backing rows and notifies all subscribers. */
  setRows(rows: TRow[]): void {
    this.rows = rows;
    for (const listener of this.listeners) {
      listener();
    }
  }

  /** Registers a change listener. Returns an unsubscribe function. */
  subscribe(onChange: () => void): () => void {
    this.listeners.add(onChange);
    return () => {
      this.listeners.delete(onChange);
    };
  }
}
