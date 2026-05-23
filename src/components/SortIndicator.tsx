import { StrataIcon } from '../icons';

export interface SortIndicatorProps {
  /** Current sort direction, or false if unsorted. */
  direction: 'asc' | 'desc' | false;
}

/**
 * Renders a sort direction indicator in the column header.
 * Shows an arrow-up icon for ascending, arrow-down for descending, nothing when unsorted.
 * The icon is decorative (aria-hidden) since sort state is communicated via aria-sort
 * on the column header element.
 */
export function SortIndicator({ direction }: SortIndicatorProps) {
  if (!direction) return null;
  return (
    <span className="strata-sort-indicator" aria-hidden="true">
      <StrataIcon name={direction === 'asc' ? 'arrow-up' : 'arrow-down'} />
    </span>
  );
}
