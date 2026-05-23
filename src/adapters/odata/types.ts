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
