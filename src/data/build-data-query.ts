import type { ColumnSort } from '../model/types';
import type { DataQuery, FilterExpression } from './types';

export interface BuildDataQueryParams {
  sort?: ColumnSort[];
  filters?: FilterExpression[];
  search?: string;
  expandedIds?: string[];
}

/**
 * Builds a DataQuery object from the grid's current state.
 * Only includes fields that have values — omits undefined fields
 * so the server can distinguish "no sort" from "sort by nothing".
 */
export function buildDataQuery(params: BuildDataQueryParams): DataQuery {
  const query: DataQuery = {};

  if (params.sort && params.sort.length > 0) {
    query.sort = params.sort;
  }
  if (params.filters && params.filters.length > 0) {
    query.filters = params.filters;
  }
  if (params.search) {
    query.search = params.search;
  }
  if (params.expandedIds && params.expandedIds.length > 0) {
    query.expandedIds = params.expandedIds;
  }

  return query;
}
