import type { Table } from '@tanstack/react-table';
import { HeaderArea } from './HeaderArea';
import { BodyViewport } from './BodyViewport';
import { GridFooter } from './GridFooter';

export interface GridRootProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
}

/** The grid layout shell. */
export function GridRoot<TRow>({ table }: GridRootProps<TRow>) {
  return (
    <div className="strata-grid" role="grid">
      <HeaderArea table={table} />
      <BodyViewport table={table} />
      <GridFooter rowCount={table.getRowModel().rows.length} />
    </div>
  );
}
