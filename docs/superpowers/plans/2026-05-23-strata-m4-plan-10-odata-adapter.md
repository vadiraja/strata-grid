# Strata M4 · Plan 10 — SAP OData DataSource Adapter · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a reference `DataSource` adapter for SAP OData v4 services, targeting BOM hierarchy patterns (STPO/MAST tables). Translates `DataQuery` sort/filter into OData `$orderby`/`$filter` syntax, supports lazy child loading via navigation properties, and handles authentication and batch requests.

**Architecture:** An `ODataDataSource` class implements the full `DataSource<TRow>` interface. It translates grid operations into OData URL parameters. A `ODataQueryBuilder` handles the translation of `FilterExpression` → OData `$filter` and `ColumnSort` → `$orderby`. The adapter supports both eager loading (via `$expand`) and lazy loading (via navigation property requests). Authentication is pluggable via a token/header provider.

**Tech Stack:** TypeScript, Vitest, MSW (Mock Service Worker) for testing.

**Spec:** `docs/superpowers/specs/2026-05-23-strata-m4-scale-enterprise-design.md` (§7).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/adapters/odata/types.ts` | create | OData adapter configuration types |
| `src/adapters/odata/query-builder.ts` | create | DataQuery → OData URL parameter translation |
| `src/adapters/odata/query-builder.test.ts` | create | Query builder unit tests |
| `src/adapters/odata/odata-data-source.ts` | create | ODataDataSource class |
| `src/adapters/odata/odata-data-source.test.ts` | create | Integration tests with MSW |
| `src/adapters/odata/index.ts` | create | Barrel export |

---

## Task 1: OData adapter types

**Files:**
- Create: `src/adapters/odata/types.ts`

- [ ] **Step 1: Create `src/adapters/odata/types.ts`**

```ts
/**
 * Authentication configuration for OData requests.
 */
export type ODataAuth =
  | { type: 'bearer'; token: string | (() => string | Promise<string>) }
  | { type: 'basic'; username: string; password: string }
  | { type: 'headers'; headers: Record<string, string> | (() => Record<string, string>) };

/**
 * Configuration for the OData DataSource adapter.
 */
export interface ODataDataSourceConfig<TRow> {
  /** OData service URL (e.g., 'https://host/sap/opu/odata4/sap/api_billofmaterial/srvd_a2x/sap/billofmaterial/0001'). */
  serviceUrl: string;
  /** Entity set name (e.g., 'BillOfMaterial'). */
  entitySet: string;
  /** Maps OData entity properties to TRow fields. */
  fieldMapping: Record<string, keyof TRow | ((entity: Record<string, unknown>) => unknown)>;
  /** OData navigation property for children (lazy tree loading). */
  childrenNavProperty?: string;
  /** OData property for parent key (flat hierarchy). */
  parentKeyProperty?: string;
  /** Property that holds the row's unique id. */
  idProperty: string;
  /** Authentication configuration. */
  auth?: ODataAuth;
  /** Default $expand for initial load. */
  defaultExpand?: string;
  /** Default $select to limit returned fields. */
  defaultSelect?: string[];
  /** Batch request configuration. */
  batch?: { enabled: boolean; maxBatchSize?: number };
  /** Request timeout in milliseconds. Default: 30000. */
  timeout?: number;
  /** Custom fetch implementation (for testing or Node.js). */
  fetch?: typeof fetch;
}

/**
 * OData response envelope for a collection.
 */
export interface ODataCollectionResponse {
  '@odata.count'?: number;
  value: Record<string, unknown>[];
  '@odata.nextLink'?: string;
}

/**
 * OData error response.
 */
export interface ODataErrorResponse {
  error: {
    code: string;
    message: string;
    details?: { code: string; message: string; target?: string }[];
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/adapters/odata/types.ts
git commit -m "feat(m4): add OData adapter types"
```

---

## Task 2: OData query builder

Translates `DataQuery` (sort, filter) into OData URL parameters (`$orderby`, `$filter`, `$top`, `$skip`, `$count`, `$expand`).

**Files:**
- Create: `src/adapters/odata/query-builder.ts`
- Create: `src/adapters/odata/query-builder.test.ts`

- [ ] **Step 1: Write failing tests — `src/adapters/odata/query-builder.test.ts`**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/adapters/odata/query-builder.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/adapters/odata/query-builder.ts`**

```ts
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
        const vals = value.map((v) => this.formatValue(v)).join(',');
        return `${columnId} in (${vals})`;
      }
      case 'isEmpty':
        return `(${columnId} eq null or ${columnId} eq '')`;
      case 'isNotEmpty':
        return `(${columnId} ne null and ${columnId} ne '')`;
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/adapters/odata/query-builder.test.ts`
Expected: PASS — all tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/adapters/odata/query-builder.ts src/adapters/odata/query-builder.test.ts
git commit -m "feat(m4): add OData query builder for $filter/$orderby translation"
```

---

## Task 3: ODataDataSource class

The full `DataSource` implementation for OData v4 services.

**Files:**
- Create: `src/adapters/odata/odata-data-source.ts`
- Create: `src/adapters/odata/odata-data-source.test.ts`

- [ ] **Step 1: Create `src/adapters/odata/odata-data-source.ts`**

```ts
import type { DataSource } from '../../data/data-source';
import type {
  DataQuery,
  DataSourceCapabilities,
  PageParams,
  PageResult,
  WhereUsedResult,
} from '../../data/types';
import type { ODataDataSourceConfig, ODataCollectionResponse, ODataAuth } from './types';
import { ODataQueryBuilder } from './query-builder';

/**
 * DataSource adapter for SAP OData v4 services.
 * Translates grid operations into OData requests.
 */
export class ODataDataSource<TRow> implements DataSource<TRow> {
  private readonly config: ODataDataSourceConfig<TRow>;
  private readonly fetchFn: typeof fetch;

  constructor(config: ODataDataSourceConfig<TRow>) {
    this.config = config;
    this.fetchFn = config.fetch ?? globalThis.fetch.bind(globalThis);
  }

  capabilities(): DataSourceCapabilities {
    return {
      serverSort: true,
      serverFilter: true,
      lazyChildren: !!this.config.childrenNavProperty,
      pagination: true,
      whereUsed: false, // Could be enabled with custom OData function imports
      exportAll: true,
    };
  }

  async load(query?: DataQuery): Promise<TRow[]> {
    const params = this.buildParams(query);
    const url = ODataQueryBuilder.buildUrl(
      this.config.serviceUrl,
      this.config.entitySet,
      {
        filter: query?.filters
          ? ODataQueryBuilder.buildFilter(query.filters)
          : undefined,
        orderBy: query?.sort
          ? ODataQueryBuilder.buildOrderBy(query.sort)
          : undefined,
        expand: this.config.defaultExpand,
        select: this.config.defaultSelect,
        count: true,
      },
    );

    const response = await this.request(url);
    const data: ODataCollectionResponse = await response.json();
    return data.value.map((entity) => this.mapEntity(entity));
  }

  async loadChildren(parentId: string, query?: DataQuery): Promise<TRow[]> {
    if (!this.config.childrenNavProperty) {
      throw new Error('childrenNavProperty not configured');
    }

    const url = ODataQueryBuilder.buildUrl(
      this.config.serviceUrl,
      `${this.config.entitySet}('${parentId}')/${this.config.childrenNavProperty}`,
      {
        orderBy: query?.sort
          ? ODataQueryBuilder.buildOrderBy(query.sort)
          : undefined,
        select: this.config.defaultSelect,
      },
    );

    const response = await this.request(url);
    const data: ODataCollectionResponse = await response.json();
    return data.value.map((entity) => this.mapEntity(entity));
  }

  async loadPage(params: PageParams): Promise<PageResult<TRow>> {
    const skip = typeof params.offset === 'number' ? params.offset : 0;
    const url = ODataQueryBuilder.buildUrl(
      this.config.serviceUrl,
      this.config.entitySet,
      {
        filter: params.query?.filters
          ? ODataQueryBuilder.buildFilter(params.query.filters)
          : undefined,
        orderBy: params.query?.sort
          ? ODataQueryBuilder.buildOrderBy(params.query.sort)
          : undefined,
        top: params.limit,
        skip,
        count: true,
        expand: this.config.defaultExpand,
        select: this.config.defaultSelect,
      },
    );

    const response = await this.request(url);
    const data: ODataCollectionResponse = await response.json();
    const rows = data.value.map((entity) => this.mapEntity(entity));
    const totalCount = data['@odata.count'] ?? rows.length;

    return {
      rows,
      totalCount,
      hasMore: skip + params.limit < totalCount,
      nextCursor: data['@odata.nextLink'],
    };
  }

  async exportAll(query?: DataQuery): Promise<TRow[]> {
    // Load all data without pagination
    return this.load(query);
  }

  /** Map an OData entity to a TRow using the configured field mapping. */
  private mapEntity(entity: Record<string, unknown>): TRow {
    const row: Record<string, unknown> = {};
    for (const [odataField, mapping] of Object.entries(this.config.fieldMapping)) {
      if (typeof mapping === 'function') {
        row[odataField] = mapping(entity);
      } else {
        row[mapping as string] = entity[odataField];
      }
    }
    return row as TRow;
  }

  /** Make an authenticated request. */
  private async request(url: string): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.config.auth) {
      await this.applyAuth(headers, this.config.auth);
    }

    const controller = new AbortController();
    const timeout = this.config.timeout ?? 30000;
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await this.fetchFn(url, {
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `OData request failed: ${response.status} ${response.statusText}\n${errorBody}`,
        );
      }

      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Apply authentication to request headers. */
  private async applyAuth(
    headers: Record<string, string>,
    auth: ODataAuth,
  ): Promise<void> {
    switch (auth.type) {
      case 'bearer': {
        const token =
          typeof auth.token === 'function' ? await auth.token() : auth.token;
        headers['Authorization'] = `Bearer ${token}`;
        break;
      }
      case 'basic': {
        const encoded = btoa(`${auth.username}:${auth.password}`);
        headers['Authorization'] = `Basic ${encoded}`;
        break;
      }
      case 'headers': {
        const customHeaders =
          typeof auth.headers === 'function' ? auth.headers() : auth.headers;
        Object.assign(headers, customHeaders);
        break;
      }
    }
  }

  private buildParams(query?: DataQuery) {
    return query ?? {};
  }
}
```

- [ ] **Step 2: Write integration tests — `src/adapters/odata/odata-data-source.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ODataDataSource } from './odata-data-source';
import type { ODataDataSourceConfig } from './types';

interface BomRow {
  id: string;
  material: string;
  description: string;
  quantity: number;
  parentId: string | null;
}

const mockResponse = {
  '@odata.count': 2,
  value: [
    { BillOfMaterialItemUUID: '1', Material: 'MAT-001', Description: 'Bolt M6', Quantity: 10, ParentItem: null },
    { BillOfMaterialItemUUID: '2', Material: 'MAT-002', Description: 'Nut M6', Quantity: 10, ParentItem: '1' },
  ],
};

const config: ODataDataSourceConfig<BomRow> = {
  serviceUrl: 'https://host/odata/v4/sap/bom',
  entitySet: 'BillOfMaterialItem',
  idProperty: 'BillOfMaterialItemUUID',
  fieldMapping: {
    BillOfMaterialItemUUID: 'id',
    Material: 'material',
    Description: 'description',
    Quantity: 'quantity',
    ParentItem: 'parentId',
  },
  childrenNavProperty: 'SubItems',
  auth: { type: 'bearer', token: 'test-token' },
};

function createMockFetch(response: unknown = mockResponse, status = 200) {
  return vi.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    } as Response),
  );
}

describe('ODataDataSource — capabilities', () => {
  it('declares server-side capabilities', () => {
    const ds = new ODataDataSource({ ...config, fetch: createMockFetch() });
    const caps = ds.capabilities();
    expect(caps.serverSort).toBe(true);
    expect(caps.serverFilter).toBe(true);
    expect(caps.lazyChildren).toBe(true);
    expect(caps.pagination).toBe(true);
  });
});

describe('ODataDataSource — load', () => {
  it('fetches and maps entities', async () => {
    const mockFetch = createMockFetch();
    const ds = new ODataDataSource({ ...config, fetch: mockFetch });
    const rows = await ds.load();

    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe('1');
    expect(rows[0].material).toBe('MAT-001');
    expect(rows[1].parentId).toBe('1');
  });

  it('includes auth header', async () => {
    const mockFetch = createMockFetch();
    const ds = new ODataDataSource({ ...config, fetch: mockFetch });
    await ds.load();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
  });

  it('builds sort/filter into URL', async () => {
    const mockFetch = createMockFetch();
    const ds = new ODataDataSource({ ...config, fetch: mockFetch });
    await ds.load({
      sort: [{ columnId: 'Material', direction: 'asc' }],
      filters: [{ columnId: 'Quantity', operator: 'greaterThan', value: 5 }],
    });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('$orderby=Material asc');
    expect(url).toContain('$filter=Quantity gt 5');
  });
});

describe('ODataDataSource — loadChildren', () => {
  it('fetches children via navigation property', async () => {
    const mockFetch = createMockFetch();
    const ds = new ODataDataSource({ ...config, fetch: mockFetch });
    await ds.loadChildren('1');

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("BillOfMaterialItem('1')/SubItems");
  });
});

describe('ODataDataSource — loadPage', () => {
  it('includes $top and $skip', async () => {
    const mockFetch = createMockFetch();
    const ds = new ODataDataSource({ ...config, fetch: mockFetch });
    const result = await ds.loadPage({ offset: 10, limit: 5 });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('$top=5');
    expect(url).toContain('$skip=10');
    expect(result.totalCount).toBe(2);
  });
});

describe('ODataDataSource — error handling', () => {
  it('throws on non-OK response', async () => {
    const mockFetch = createMockFetch({ error: { code: '401', message: 'Unauthorized' } }, 401);
    const ds = new ODataDataSource({ ...config, fetch: mockFetch });

    await expect(ds.load()).rejects.toThrow('OData request failed: 401');
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/adapters/odata/odata-data-source.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/adapters/odata/odata-data-source.ts src/adapters/odata/odata-data-source.test.ts
git commit -m "feat(m4): add ODataDataSource adapter for SAP OData v4"
```

---

## Task 4: Barrel export

**Files:**
- Create: `src/adapters/odata/index.ts`

- [ ] **Step 1: Create `src/adapters/odata/index.ts`**

```ts
export { ODataDataSource } from './odata-data-source';
export { ODataQueryBuilder } from './query-builder';
export type {
  ODataDataSourceConfig,
  ODataAuth,
  ODataCollectionResponse,
  ODataErrorResponse,
} from './types';
```

- [ ] **Step 2: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 3: Commit**

```bash
git add src/adapters/odata/index.ts
git commit -m "feat(m4): add OData adapter barrel export"
```
