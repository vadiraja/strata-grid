export interface GridFooterProps {
  /** Number of rows currently shown. */
  rowCount: number;
}

/** Renders the grid footer with the current row count. */
export function GridFooter({ rowCount }: GridFooterProps) {
  return (
    <div className="strata-footer">
      <span className="strata-footer-count">
        {rowCount} {rowCount === 1 ? 'row' : 'rows'}
      </span>
    </div>
  );
}
