import { flexRender, type Header } from '@tanstack/react-table';

export interface ColumnGroupHeaderCellProps<TRow> {
  /** TanStack header representing a group or placeholder. */
  header: Header<TRow, unknown>;
}

/** Renders a grouped header cell spanning its visible leaf columns. */
export function ColumnGroupHeaderCell<TRow>({
  header,
}: ColumnGroupHeaderCellProps<TRow>) {
  const width = header.getSize();

  return (
    <div
      className="strata-header-cell strata-column-group-header-cell"
      role="columnheader"
      aria-colspan={header.colSpan}
      style={{ width, flex: `0 0 ${width}px` }}
    >
      {!header.isPlaceholder &&
        flexRender(header.column.columnDef.header, header.getContext())}
    </div>
  );
}
