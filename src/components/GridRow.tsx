import type { CSSProperties } from 'react';
import type { Row } from '@tanstack/react-table';
import { DataCell } from './DataCell';

export interface GridRowProps<TRow> {
  /** The TanStack row to render. */
  row: Row<TRow>;
  /** Positioning style applied by the row virtualizer. */
  style?: CSSProperties;
}

/** Renders one body row as a horizontal strip of cells. */
export function GridRow<TRow>({ row, style }: GridRowProps<TRow>) {
  return (
    <div className="strata-row" role="row" style={style}>
      {row.getVisibleCells().map((cell) => (
        <DataCell key={cell.id} cell={cell} />
      ))}
    </div>
  );
}
