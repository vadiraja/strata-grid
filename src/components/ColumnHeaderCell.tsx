import type { Header } from '@tanstack/react-table';

export interface ColumnHeaderCellProps<TRow> {
  /** The TanStack header to render. */
  header: Header<TRow, unknown>;
}

/** Renders a single column header cell. */
export function ColumnHeaderCell<TRow>({ header }: ColumnHeaderCellProps<TRow>) {
  const strataColumn = header.column.columnDef.meta!.strataColumn;
  const width = header.getSize();
  return (
    <div className="strata-header-cell" role="columnheader" style={{ width }}>
      {strataColumn.header}
    </div>
  );
}
