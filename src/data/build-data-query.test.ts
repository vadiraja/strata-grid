import { describe, it, expect } from 'vitest';
import { buildDataQuery } from './build-data-query';
import type { ColumnSort } from '../model/types';
import type { FilterExpression } from './types';

describe('buildDataQuery', () => {
  it('returns empty query when no sort or filter', () => {
    const query = buildDataQuery({});
    expect(query).toEqual({});
  });

  it('includes sort when provided', () => {
    const sort: ColumnSort[] = [
      { columnId: 'name', direction: 'asc' },
      { columnId: 'age', direction: 'desc' },
    ];
    const query = buildDataQuery({ sort });
    expect(query.sort).toEqual(sort);
  });

  it('includes filters when provided', () => {
    const filters: FilterExpression[] = [
      { columnId: 'name', operator: 'contains', value: 'Alice' },
    ];
    const query = buildDataQuery({ filters });
    expect(query.filters).toEqual(filters);
  });

  it('includes search term when provided', () => {
    const query = buildDataQuery({ search: 'hello' });
    expect(query.search).toBe('hello');
  });

  it('includes expanded ids when provided', () => {
    const query = buildDataQuery({ expandedIds: ['a', 'b', 'c'] });
    expect(query.expandedIds).toEqual(['a', 'b', 'c']);
  });

  it('combines all fields', () => {
    const sort: ColumnSort[] = [{ columnId: 'name', direction: 'asc' }];
    const filters: FilterExpression[] = [
      { columnId: 'age', operator: 'greaterThan', value: 25 },
    ];
    const query = buildDataQuery({
      sort,
      filters,
      search: 'test',
      expandedIds: ['x'],
    });
    expect(query).toEqual({ sort, filters, search: 'test', expandedIds: ['x'] });
  });

  it('omits undefined fields from the query', () => {
    const query = buildDataQuery({ sort: [{ columnId: 'a', direction: 'asc' }] });
    expect(query).not.toHaveProperty('filters');
    expect(query).not.toHaveProperty('search');
    expect(query).not.toHaveProperty('expandedIds');
  });
});
