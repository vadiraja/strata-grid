import { describe, it, expect, vi } from 'vitest';
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
  return vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
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

    const url = String(mockFetch.mock.calls[0]![0]);
    expect(url).toContain('$orderby=Material asc');
    expect(url).toContain('$filter=Quantity gt 5');
  });
});

describe('ODataDataSource — loadChildren', () => {
  it('fetches children via navigation property', async () => {
    const mockFetch = createMockFetch();
    const ds = new ODataDataSource({ ...config, fetch: mockFetch });
    await ds.loadChildren('1');

    const url = String(mockFetch.mock.calls[0]![0]);
    expect(url).toContain("BillOfMaterialItem('1')/SubItems");
  });
});

describe('ODataDataSource — loadPage', () => {
  it('includes $top and $skip', async () => {
    const mockFetch = createMockFetch();
    const ds = new ODataDataSource({ ...config, fetch: mockFetch });
    const result = await ds.loadPage({ offset: 10, limit: 5 });

    const url = String(mockFetch.mock.calls[0]![0]);
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
