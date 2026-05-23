import { useMemo, useState } from 'react';
import {
  DataGrid,
  type ColumnDef,
  type FilterExpression,
  type ViewState,
} from 'strata-grid';
import 'strata-grid/styles.css';

interface Supplier {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'inactive';
  kind: 'vendor' | 'supplier' | 'both';
  isPreferred: boolean;
  onboardedAt: string;
}

const data: Supplier[] = [
  { id: 'S-1001', name: 'Acme Corp', status: 'active', kind: 'vendor', isPreferred: true, onboardedAt: '2024-03-12' },
  { id: 'S-1002', name: 'Bolt Inc', status: 'pending', kind: 'supplier', isPreferred: false, onboardedAt: '2025-01-05' },
  { id: 'S-1003', name: 'Cargo Ltd', status: 'inactive', kind: 'both', isPreferred: false, onboardedAt: '2023-11-22' },
  { id: 'S-1004', name: 'Delta GmbH', status: 'active', kind: 'vendor', isPreferred: true, onboardedAt: '2024-09-14' },
  { id: 'S-1005', name: 'Echo SA', status: 'active', kind: 'supplier', isPreferred: false, onboardedAt: '2025-02-18' },
  { id: 'S-1006', name: 'Foxtrot KK', status: 'pending', kind: 'both', isPreferred: true, onboardedAt: '2025-04-01' },
];

const columns: ColumnDef<Supplier>[] = [
  { id: 'id', header: 'ID', accessor: 'id', width: 90 },
  {
    id: 'name',
    header: 'Name',
    accessor: 'name',
    flex: 1,
    filter: { type: 'text', operators: ['contains', 'startsWith', 'equals'] },
  },
  {
    id: 'status',
    header: 'Status',
    accessor: 'status',
    width: 130,
    filter: {
      type: 'select',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Pending', value: 'pending' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
  },
  {
    id: 'kind',
    header: 'Kind',
    accessor: 'kind',
    width: 160,
    filter: {
      type: 'select',
      multi: true,
      options: [
        { label: 'Vendor', value: 'vendor' },
        { label: 'Supplier', value: 'supplier' },
        { label: 'Both', value: 'both' },
      ],
    },
  },
  {
    id: 'isPreferred',
    header: 'Preferred',
    accessor: 'isPreferred',
    width: 110,
    filter: { type: 'boolean' },
    cell: ({ value }) => (value ? 'Yes' : 'No'),
  },
  {
    id: 'onboardedAt',
    header: 'Onboarded',
    accessor: 'onboardedAt',
    width: 200,
    filter: { type: 'date', range: true },
  },
];

export default function TypedFiltersExample() {
  const [emittedFilters, setEmittedFilters] = useState<FilterExpression[]>([]);

  // Stable wrapper to surface the emitted filters from ViewState.
  const onViewStateChange = useMemo(
    () => (s: ViewState) => setEmittedFilters(s.filters),
    [],
  );

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <DataGrid<Supplier>
        data={data}
        columns={columns}
        height={300}
        onViewStateChange={onViewStateChange}
      />
      <div
        style={{
          padding: 12,
          border: '1px solid #ddd',
          borderRadius: 6,
          background: '#fafafa',
          fontFamily: 'monospace',
          fontSize: 12,
        }}
      >
        <div style={{ marginBottom: 6, fontWeight: 'bold' }}>
          Emitted FilterExpression[]:
        </div>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {emittedFilters.length === 0
            ? '(none — apply a column filter to see the emitted shape)'
            : JSON.stringify(emittedFilters, null, 2)}
        </pre>
      </div>
    </div>
  );
}
