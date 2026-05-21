import type { Table } from '@tanstack/react-table';
import { ColumnHeaderCell } from './ColumnHeaderCell';

export interface HeaderAreaProps<TRow> {
  /** The TanStack table instance. */
  table: Table<TRow>;
}

/** Renders the grid header — one row of column header cells. */
export function HeaderArea<TRow>({ table }: HeaderAreaProps<TRow>) {
  return (
    <div className="strata-header" role="rowgroup">
      {table.getHeaderGroups().map((headerGroup) => (
        <div className="strata-header-row" role="row" key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <ColumnHeaderCell key={header.id} header={header} />
          ))}
        </div>
      ))}
    </div>
  );
}
