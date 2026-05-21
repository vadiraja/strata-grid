export interface SortIndicatorProps {
  /** Current sort direction, or false if unsorted. */
  direction: 'asc' | 'desc' | false;
}

/**
 * Renders a sort direction indicator in the column header.
 * Shows ▲ for ascending, ▼ for descending, nothing when unsorted.
 */
export function SortIndicator({ direction }: SortIndicatorProps) {
  if (!direction) return null;
  return (
    <span className="strata-sort-indicator" aria-hidden="true">
      {direction === 'asc' ? '▲' : '▼'}
    </span>
  );
}
