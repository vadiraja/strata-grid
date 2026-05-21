import type { Table } from '@tanstack/react-table';
import { HeaderArea } from './HeaderArea';
import { BodyViewport } from './BodyViewport';
import { GridFooter } from './GridFooter';

export interface GridRootProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
  /** Height of the scrollable body area in pixels. */
  height: number;
  /**
   * Id of the tree column. Set only in tree mode; switches the grid to the
   * `treegrid` ARIA role and tells rows which cell renders the hierarchy.
   */
  treeColumnId?: string;
}

/** The grid layout shell. */
export function GridRoot<TRow>({
  table,
  height,
  treeColumnId,
}: GridRootProps<TRow>) {
  return (
    <div
      className="strata-grid"
      role={treeColumnId === undefined ? 'grid' : 'treegrid'}
    >
      <HeaderArea table={table} />
      <BodyViewport table={table} height={height} treeColumnId={treeColumnId} />
      <GridFooter rowCount={table.getRowModel().rows.length} />
    </div>
  );
}
