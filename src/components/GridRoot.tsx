import type { Table } from '@tanstack/react-table';
import { HeaderArea } from './HeaderArea';
import { BodyViewport } from './BodyViewport';
import { GridFooter } from './GridFooter';

export interface GridRootProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
  /** Height of the scrollable body area in pixels. */
  height: number;
}

/** The grid layout shell. */
export function GridRoot<TRow>({ table, height }: GridRootProps<TRow>) {
  return (
    <div className="strata-grid" role="grid">
      <HeaderArea table={table} />
      <BodyViewport table={table} height={height} />
      <GridFooter rowCount={table.getRowModel().rows.length} />
    </div>
  );
}
