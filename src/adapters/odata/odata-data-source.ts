import type { DataSource } from '../../data/data-source';
import type {
  DataQuery,
  DataSourceCapabilities,
  PageParams,
  PageResult,
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
      whereUsed: false,
      exportAll: true,
    };
  }

  async load(query?: DataQuery): Promise<TRow[]> {
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
}
