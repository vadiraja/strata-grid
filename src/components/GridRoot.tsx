import type { Table } from '@tanstack/react-table';
import { BodyViewport } from './BodyViewport';

export interface GridRootProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
}

/** The grid layout shell. */
export function GridRoot<TRow>({ table }: GridRootProps<TRow>) {
  return (
    <div className="strata-grid" role="grid">
      <BodyViewport table={table} />
    </div>
  );
}
