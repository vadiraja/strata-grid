import type { ColumnDef } from '../model/types';
import type { AggregateMap } from '../model/use-aggregation';
import { AggregateCell } from './AggregateCell';

export interface GridFooterProps<TRow> {
  /** Number of rows currently shown. */
  rowCount: number;
  /** Columns with aggregate values to render in the footer. */
  aggregateColumns?: ColumnDef<TRow>[];
  /** Footer aggregate values keyed by column id. */
  aggregates?: AggregateMap;
}

/** Renders the grid footer with the current row count. */
export function GridFooter<TRow>({
  rowCount,
  aggregateColumns = [],
  aggregates,
}: GridFooterProps<TRow>) {
  return (
    <div className="strata-footer">
      <span className="strata-footer-count">
        {rowCount} {rowCount === 1 ? 'row' : 'rows'}
      </span>
      {aggregateColumns.length > 0 && aggregates && (
        <span className="strata-footer-aggregates">
          {aggregateColumns.map((column) => (
            <AggregateCell
              key={column.id}
              column={column}
              value={aggregates.get(column.id)}
            />
          ))}
        </span>
      )}
    </div>
  );
}
