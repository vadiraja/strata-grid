import { DataGrid, type ColumnDef, type TreeDataConfig } from '../src/index';
import '../src/strata.css';

/**
 * Throwaway dev playground for Strata.
 * The full examples app is Plan 7 in docs/roadmap.md.
 */

interface BomNode {
  id: string;
  material: string;
  description: string;
  qty: number;
  uom: string;
  children?: BomNode[];
}

const bom: BomNode[] = [
  {
    id: 'FG-1000',
    material: 'FG-1000',
    description: 'Mountain Bike — Trail 29',
    qty: 1,
    uom: 'EA',
    children: [
      {
        id: 'SA-2000',
        material: 'SA-2000',
        description: 'Frame Assembly',
        qty: 1,
        uom: 'EA',
        children: [
          { id: 'PT-3000', material: 'PT-3000', description: 'Front Triangle', qty: 1, uom: 'EA' },
          { id: 'PT-3001', material: 'PT-3001', description: 'Rear Triangle', qty: 1, uom: 'EA' },
          { id: 'PT-3002', material: 'PT-3002', description: 'Pivot Bearing', qty: 4, uom: 'EA' },
        ],
      },
      {
        id: 'SA-2001',
        material: 'SA-2001',
        description: 'Wheel Set',
        qty: 2,
        uom: 'EA',
        children: [
          { id: 'PT-3100', material: 'PT-3100', description: 'Rim 29"', qty: 1, uom: 'EA' },
          { id: 'PT-3101', material: 'PT-3101', description: 'Spoke', qty: 32, uom: 'EA' },
          { id: 'PT-3102', material: 'PT-3102', description: 'Hub', qty: 1, uom: 'EA' },
          { id: 'PT-3103', material: 'PT-3103', description: 'Tyre 29x2.4', qty: 1, uom: 'EA' },
        ],
      },
      {
        id: 'SA-2002',
        material: 'SA-2002',
        description: 'Drivetrain Group',
        qty: 1,
        uom: 'EA',
        children: [
          { id: 'PT-3200', material: 'PT-3200', description: 'Crankset', qty: 1, uom: 'EA' },
          { id: 'PT-3201', material: 'PT-3201', description: 'Chain', qty: 1, uom: 'M' },
          { id: 'PT-3202', material: 'PT-3202', description: 'Cassette 12s', qty: 1, uom: 'EA' },
          { id: 'PT-3203', material: 'PT-3203', description: 'Rear Derailleur', qty: 1, uom: 'EA' },
        ],
      },
      { id: 'PT-2003', material: 'PT-2003', description: 'Handlebar', qty: 1, uom: 'EA' },
      { id: 'PT-2004', material: 'PT-2004', description: 'Saddle', qty: 1, uom: 'EA' },
    ],
  },
];

const columns: ColumnDef<BomNode>[] = [
  { id: 'material', header: 'Material', accessor: 'material', width: 150, isTreeColumn: true },
  { id: 'description', header: 'Description', accessor: 'description', width: 260 },
  { id: 'qty', header: 'Qty', accessor: 'qty', width: 80 },
  { id: 'uom', header: 'UoM', accessor: 'uom', width: 80 },
];

const treeData: TreeDataConfig<BomNode> = {
  getRowId: (r) => r.id,
  getChildren: (r) => r.children,
};

export function App() {
  return (
    <div style={{ padding: 32, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Strata — Plan 3 Playground</h1>
      <p style={{ color: '#86868b', fontSize: 14, margin: '0 0 20px' }}>
        Tree data · multi-level indented bill of materials · expand / collapse
      </p>
      <DataGrid
        data={bom}
        columns={columns}
        treeData={treeData}
        defaultExpanded
        height={520}
      />
    </div>
  );
}
