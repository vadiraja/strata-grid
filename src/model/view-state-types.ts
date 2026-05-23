import type { ColumnSort } from './types';
import type { FilterExpression } from '../data/types';

/**
 * Serializable grid view state for persistence.
 * Contains all user-configurable aspects of the grid layout.
 */
export interface ViewState {
  /** Column order (array of column ids). */
  columnOrder: string[];
  /** Column widths keyed by column id. */
  columnSizing: Record<string, number>;
  /** Pinned columns. */
  columnPinning: { left: string[]; right: string[] };
  /** Current sort state. */
  sorting: ColumnSort[];
  /** Current filter expressions. */
  filters: FilterExpression[];
  /** Expanded node ids (tree mode). */
  expandedIds: string[];
  /** Hidden column ids. */
  hiddenColumns: string[];
  /** Global search term. */
  searchTerm?: string;
}
