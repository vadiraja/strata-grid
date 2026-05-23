import { useMemo, useState } from 'react';
import {
  DataGrid,
  type ColumnDef,
  type DataSource,
  type DataSourceCapabilities,
  type PageParams,
  type PageResult,
} from 'strata-grid';
import 'strata-grid/styles.css';

interface Supplier {
  id: string;
  name: string;
  country: string;
  status: 'active' | 'pending' | 'inactive';
  partsCount: number;
}

// Synthetic data — pretend this lives on a server.
const ALL: Supplier[] = Array.from({ length: 137 }, (_, i) => ({
  id: `S-${1000 + i}`,
  name: `Supplier ${1000 + i}`,
  country: ['US', 'DE', 'JP', 'IN', 'BR'][i % 5],
  status: (['active', 'pending', 'inactive'] as const)[i % 3],
  partsCount: ((i * 7) % 240) + 1,
}));

interface MockSourceHandle {
  source: DataSource<Supplier>;
  subscribe: (listener: (state: { totalCount: number; isLoading: boolean }) => void) => () => void;
}

// Mock adapter — simulates an HTTP fetch with sort/filter/q + skip/take.
// Exposes a subscribe() seam so consumers can read totalCount/isLoading
// for status-bar rendering. In a real app, this would wrap your fetch().
function createMockSource(): MockSourceHandle {
  const listeners = new Set<(s: { totalCount: number; isLoading: boolean }) => void>();
  let totalCount = 0;
  let isLoading = false;
  const emit = () => listeners.forEach((fn) => fn({ totalCount, isLoading }));

  const source: DataSource<Supplier> = {
    async load() {
      return ALL;
    },
    async loadPage({ offset, limit, query }: PageParams): Promise<PageResult<Supplier>> {
      isLoading = true;
      emit();
      await new Promise((r) => setTimeout(r, 250));

      let rows = [...ALL];

      if (query?.search) {
        const needle = query.search.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.name.toLowerCase().includes(needle) ||
            r.country.toLowerCase().includes(needle) ||
            r.status.toLowerCase().includes(needle),
        );
      }

      query?.filters?.forEach((f) => {
        if (!f.columnId || !f.operator) return;
        rows = rows.filter((r) => {
          const v = String((r as Record<string, unknown>)[f.columnId!] ?? '');
          const needle = String(f.value ?? '');
          if (f.operator === 'equals') return v === needle;
          if (f.operator === 'contains')
            return v.toLowerCase().includes(needle.toLowerCase());
          return true;
        });
      });

      const sort = query?.sort?.[0];
      if (sort) {
        rows.sort((a, b) => {
          const av = (a as Record<string, unknown>)[sort.columnId];
          const bv = (b as Record<string, unknown>)[sort.columnId];
          const cmp = av == null ? -1 : bv == null ? 1 : av < bv ? -1 : av > bv ? 1 : 0;
          return sort.direction === 'desc' ? -cmp : cmp;
        });
      }

      const total = rows.length;
      const start = typeof offset === 'number' ? offset : 0;
      const slice = rows.slice(start, start + limit);

      totalCount = total;
      isLoading = false;
      emit();

      return { rows: slice, totalCount: total, hasMore: start + limit < total };
    },
    capabilities(): DataSourceCapabilities {
      return { pagination: true, serverSort: true, serverFilter: true };
    },
  };

  return {
    source,
    subscribe: (listener) => {
      listeners.add(listener);
      listener({ totalCount, isLoading });
      return () => listeners.delete(listener);
    },
  };
}

const columns: ColumnDef<Supplier>[] = [
  { id: 'id', header: 'ID', accessor: 'id', width: 100 },
  { id: 'name', header: 'Name', accessor: 'name', filter: 'text', flex: 1 },
  { id: 'country', header: 'Country', accessor: 'country', filter: 'text', width: 110 },
  { id: 'status', header: 'Status', accessor: 'status', filter: 'text', width: 110 },
  { id: 'partsCount', header: 'Parts', accessor: 'partsCount', filter: 'number', width: 90 },
];

export default function MockListGrid() {
  const handle = useMemo(() => createMockSource(), []);
  const [serverState, setServerState] = useState({ totalCount: 0, isLoading: false });
  const [selectedCount, setSelectedCount] = useState(0);

  // Subscribe once to the adapter for status-bar data.
  useMemo(() => handle.subscribe(setServerState), [handle]);

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 13,
          color: '#555',
        }}
      >
        <span>
          {serverState.isLoading ? 'Loading…' : `${serverState.totalCount} suppliers`}
          {selectedCount > 0 ? ` · ${selectedCount} selected` : ''}
        </span>
        <span>server-driven · 25 per page</span>
      </div>
      <DataGrid
        data={[]}
        columns={columns}
        dataSource={handle.source}
        height={360}
        pagination={{ pageSize: 25, mode: 'pages' }}
        selection={{ mode: 'multi' }}
        onSelectionChange={(s) => setSelectedCount(s.selectedIds.size)}
      />
    </div>
  );
}
