import { DataGrid, type ColumnDef } from '../src/index';
import '../src/strata.css';

/**
 * Throwaway dev playground for Strata.
 * The full examples app is Plan 7 in docs/roadmap.md.
 */

interface BomRow {
  id: string;
  material: string;
  description: string;
  qty: number;
  uom: string;
  type: 'FERT' | 'HALB' | 'ROH';
}

const TYPES: BomRow['type'][] = ['FERT', 'HALB', 'ROH'];
const UOMS = ['EA', 'M', 'KG', 'SET', 'KIT'];

function makeRows(count: number): BomRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    material: `MAT-${String(i + 1).padStart(5, '0')}`,
    description: `Component ${i + 1}`,
    qty: (i % 9) + 1,
    uom: UOMS[i % UOMS.length],
    type: TYPES[i % TYPES.length],
  }));
}

const data = makeRows(2000);

const typeColor: Record<BomRow['type'], string> = {
  FERT: '#0a84ff',
  HALB: '#ff9f0a',
  ROH: '#86868b',
};

const columns: ColumnDef<BomRow>[] = [
  { id: 'material', header: 'Material', accessor: 'material', width: 160 },
  { id: 'description', header: 'Description', accessor: 'description', width: 240 },
  { id: 'qty', header: 'Qty', accessor: 'qty', width: 80 },
  { id: 'uom', header: 'UoM', accessor: 'uom', width: 70 },
  {
    id: 'type',
    header: 'Type',
    accessor: 'type',
    width: 110,
    cell: ({ value }) => (
      <span
        style={{
          background: typeColor[value as BomRow['type']],
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 4,
        }}
      >
        {String(value)}
      </span>
    ),
  },
];

export function App() {
  return (
    <div style={{ padding: 32, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Strata — Plan 2 Playground</h1>
      <p style={{ color: '#86868b', fontSize: 14, margin: '0 0 20px' }}>
        Row virtualization · 2,000 rows · only the visible window is in the DOM
      </p>
      <DataGrid data={data} columns={columns} height={520} />
    </div>
  );
}
