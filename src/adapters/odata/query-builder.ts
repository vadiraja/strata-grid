import type { ColumnSort } from '../../model/types';
import type { FilterExpression } from '../../data/types';

export interface ODataUrlParams {
  filter?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
  count?: boolean;
  expand?: string;
  select?: string[];
}

/**
 * Translates Strata DataQuery objects into OData v4 URL parameters.
 */
export class ODataQueryBuilder {
  /**
   * Build $orderby string from ColumnSort array.
   */
  static buildOrderBy(sort: ColumnSort[]): string {
    if (!sort || sort.length === 0) return '';
    return sort.map((s) => `${s.columnId} ${s.direction}`).join(',');
  }

  /**
   * Build $filter string from FilterExpression array.
   */
  static buildFilter(filters: FilterExpression[]): string {
    if (!filters || filters.length === 0) return '';
    return filters.map((f) => this.expressionToOData(f)).join(' and ');
  }

  /**
   * Build a complete OData URL.
   */
  static buildUrl(
    serviceUrl: string,
    entitySet: string,
    params: ODataUrlParams,
  ): string {
    const base = `${serviceUrl.replace(/\/$/, '')}/${entitySet}`;
    const queryParts: string[] = [];

    if (params.filter) {
      queryParts.push(`$filter=${params.filter}`);
    }
    if (params.orderBy) {
      queryParts.push(`$orderby=${params.orderBy}`);
    }
    if (params.top != null) {
      queryParts.push(`$top=${params.top}`);
    }
    if (params.skip != null) {
      queryParts.push(`$skip=${params.skip}`);
    }
    if (params.count) {
      queryParts.push('$count=true');
    }
    if (params.expand) {
      queryParts.push(`$expand=${params.expand}`);
    }
    if (params.select && params.select.length > 0) {
      queryParts.push(`$select=${params.select.join(',')}`);
    }

    return queryParts.length > 0 ? `${base}?${queryParts.join('&')}` : base;
  }

  /**
   * Convert a single FilterExpression to OData $filter syntax.
   */
  private static expressionToOData(expr: FilterExpression): string {
    // Compound expression
    if (expr.children && expr.children.length > 0) {
      const logic = expr.logic ?? 'and';
      const parts = expr.children.map((c) => this.expressionToOData(c));
      return `(${parts.join(` ${logic} `)})`;
    }

    // Leaf expression
    const { columnId, operator, value } = expr;
    if (!columnId || !operator) return '';

    switch (operator) {
      case 'equals':
        return `${columnId} eq ${this.formatValue(value)}`;
      case 'notEquals':
        return `${columnId} ne ${this.formatValue(value)}`;
      case 'greaterThan':
        return `${columnId} gt ${this.formatNumeric(value)}`;
      case 'lessThan':
        return `${columnId} lt ${this.formatNumeric(value)}`;
      case 'greaterOrEqual':
        return `${columnId} ge ${this.formatNumeric(value)}`;
      case 'lessOrEqual':
        return `${columnId} le ${this.formatNumeric(value)}`;
      case 'contains':
        return `contains(${columnId},${this.formatValue(value)})`;
      case 'startsWith':
        return `startswith(${columnId},${this.formatValue(value)})`;
      case 'endsWith':
        return `endswith(${columnId},${this.formatValue(value)})`;
      case 'in': {
        if (!Array.isArray(value)) return '';
        const vals = value.map((v: unknown) => this.formatValue(v)).join(',');
        return `${columnId} in (${vals})`;
      }
      case 'isEmpty':
        return `(${columnId} eq null or ${columnId} eq '')`;
      case 'isNotEmpty':
        return `(${columnId} ne null and ${columnId} ne '')`;
      case 'notContains':
        return `not contains(${columnId},${this.formatValue(value)})`;
      case 'between':
        return '';
      default:
        return '';
    }
  }

  private static formatValue(value: unknown): string {
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  private static formatNumeric(value: unknown): string | number {
    return typeof value === 'number' ? value : Number(value);
  }
}
