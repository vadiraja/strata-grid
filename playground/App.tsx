import { DataGrid, type ColumnDef } from '../src/index';
import '../src/strata.css';

/**
 * Throwaway dev playground for Strata Plan 1 (flat grid).
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

const data: BomRow[] = [
  { id: '1', material: 'BIKE-MTB-26', description: 'Mountain Bike, 26"', qty: 1, uom: 'EA', type: 'FERT' },
  { id: '2', material: 'ASSY-FRAME', description: 'Frame Assembly, Welded', qty: 1, uom: 'EA', type: 'HALB' },
  { id: '3', material: 'ASSY-WHEEL', description: 'Wheel Assembly, Disc', qty: 2, uom: 'EA', type: 'HALB' },
  { id: '4', material: 'ASSY-DRIVE', description: 'Drivetrain Assembly', qty: 1, uom: 'EA', type: 'HALB' },
  { id: '5', material: 'BRAKE-DISC', description: 'Disc Brake Set', qty: 1, uom: 'SET', type: 'HALB' },
  { id: '6', material: 'TUBE-AL6061', description: 'Aluminum Tube 6061-T6', qty: 1.2, uom: 'M', type: 'ROH' },
  { id: '7', material: 'RIM-26', description: 'Rim, 26" Double-Wall', qty: 2, uom: 'EA', type: 'HALB' },
  { id: '8', material: 'SPOKE-SS', description: 'Spoke, Stainless 290mm', qty: 64, uom: 'EA', type: 'ROH' },
  { id: '9', material: 'ROTOR-160', description: 'Rotor, 160mm 6-Bolt', qty: 2, uom: 'EA', type: 'ROH' },
  { id: '10', material: 'KIT-WELD', description: 'Weld Consumables Kit', qty: 1, uom: 'KIT', type: 'ROH' },
];

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
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Strata — Plan 1 Playground</h1>
      <p style={{ color: '#86868b', fontSize: 14, margin: '0 0 20px' }}>
        Flat data grid · column headers · custom cell renderer on Type · footer row count
      </p>
      <DataGrid data={data} columns={columns} />
    </div>
  );
}
