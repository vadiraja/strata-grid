import { describe, it, expect } from 'vitest';
import { ODataQueryBuilder } from './query-builder';
import type { FilterExpression } from '../../data/types';
import type { ColumnSort } from '../../model/types';

describe('ODataQueryBuilder — $orderby', () => {
  it('builds single column sort', () => {
    const sort: ColumnSort[] = [{ columnId: 'MaterialNumber', direction: 'asc' }];
    const result = ODataQueryBuilder.buildOrderBy(sort);
    expect(result).toBe('MaterialNumber asc');
  });

  it('builds multi-column sort', () => {
    const sort: ColumnSort[] = [
      { columnId: 'Plant', direction: 'asc' },
      { columnId: 'MaterialNumber', direction: 'desc' },
    ];
    const result = ODataQueryBuilder.buildOrderBy(sort);
    expect(result).toBe('Plant asc,MaterialNumber desc');
  });

  it('returns empty string for no sort', () => {
    expect(ODataQueryBuilder.buildOrderBy([])).toBe('');
  });
});

describe('ODataQueryBuilder — $filter', () => {
  it('builds equals filter', () => {
    const filter: FilterExpression = {
      columnId: 'Plant',
      operator: 'equals',
      value: '1000',
    };
    const result = ODataQueryBuilder.buildFilter([filter]);
    expect(result).toBe("Plant eq '1000'");
  });

  it('builds numeric comparison', () => {
    const filter: FilterExpression = {
      columnId: 'Quantity',
      operator: 'greaterThan',
      value: 10,
    };
    const result = ODataQueryBuilder.buildFilter([filter]);
    expect(result).toBe('Quantity gt 10');
  });

  it('builds contains filter', () => {
    const filter: FilterExpression = {
      columnId: 'Description',
      operator: 'contains',
      value: 'bolt',
    };
    const result = ODataQueryBuilder.buildFilter([filter]);
    expect(result).toBe("contains(Description,'bolt')");
  });

  it('builds startsWith filter', () => {
    const filter: FilterExpression = {
      columnId: 'MaterialNumber',
      operator: 'startsWith',
      value: 'MAT',
    };
    const result = ODataQueryBuilder.buildFilter([filter]);
    expect(result).toBe("startswith(MaterialNumber,'MAT')");
  });

  it('builds AND compound filter', () => {
    const filter: FilterExpression = {
      logic: 'and',
      children: [
        { columnId: 'Plant', operator: 'equals', value: '1000' },
        { columnId: 'Quantity', operator: 'greaterThan', value: 5 },
      ],
    };
    const result = ODataQueryBuilder.buildFilter([filter]);
    expect(result).toBe("(Plant eq '1000' and Quantity gt 5)");
  });

  it('builds OR compound filter', () => {
    const filter: FilterExpression = {
      logic: 'or',
      children: [
        { columnId: 'Status', operator: 'equals', value: 'Active' },
        { columnId: 'Status', operator: 'equals', value: 'Pending' },
      ],
    };
    const result = ODataQueryBuilder.buildFilter([filter]);
    expect(result).toBe("(Status eq 'Active' or Status eq 'Pending')");
  });

  it('builds in filter', () => {
    const filter: FilterExpression = {
      columnId: 'Plant',
      operator: 'in',
      value: ['1000', '2000', '3000'],
    };
    const result = ODataQueryBuilder.buildFilter([filter]);
    expect(result).toBe("Plant in ('1000','2000','3000')");
  });

  it('handles isEmpty', () => {
    const filter: FilterExpression = {
      columnId: 'Description',
      operator: 'isEmpty',
    };
    const result = ODataQueryBuilder.buildFilter([filter]);
    expect(result).toBe("(Description eq null or Description eq '')");
  });
});

describe('ODataQueryBuilder — buildUrl', () => {
  it('builds a complete URL with all parameters', () => {
    const url = ODataQueryBuilder.buildUrl(
      'https://host/odata/v4',
      'Materials',
      {
        filter: "Plant eq '1000'",
        orderBy: 'MaterialNumber asc',
        top: 50,
        skip: 0,
        count: true,
        expand: 'Components',
        select: ['MaterialNumber', 'Description', 'Plant'],
      },
    );
    expect(url).toContain('https://host/odata/v4/Materials');
    expect(url).toContain("$filter=Plant eq '1000'");
    expect(url).toContain('$orderby=MaterialNumber asc');
    expect(url).toContain('$top=50');
    expect(url).toContain('$skip=0');
    expect(url).toContain('$count=true');
    expect(url).toContain('$expand=Components');
    expect(url).toContain('$select=MaterialNumber,Description,Plant');
  });

  it('omits empty parameters', () => {
    const url = ODataQueryBuilder.buildUrl(
      'https://host/odata/v4',
      'Materials',
      { top: 50 },
    );
    expect(url).not.toContain('$filter');
    expect(url).not.toContain('$orderby');
    expect(url).toContain('$top=50');
  });
});
