import { useMemo, useState } from 'react';
import {
  DataGrid,
  type AnyColumn,
  type ColumnDef,
  type GridTheme,
  type SelectionConfig,
  type TreeDataConfig,
} from '../src/index';
import '../src/strata.css';

type ExampleKey = 'tree' | 'wide' | 'selection' | 'columnGroups' | 'rowGrouping';

interface ExampleConfig {
  key: ExampleKey;
  label: string;
  summary: string;
}

const examples: ExampleConfig[] = [
  {
    key: 'tree',
    label: 'Tree BOM',
    summary: 'Hierarchy, tree expand/collapse, sorting, filtering, and pinned identity columns.',
  },
  {
    key: 'wide',
    label: 'Wide Planning',
    summary: 'Pinning, resize, drag reorder, virtualized center columns, sorting, filtering, and horizontal scroll.',
  },
  {
    key: 'selection',
    label: 'Selection',
    summary: 'Checkbox selection with tri-state cascade across parent and child BOM rows.',
  },
  {
    key: 'columnGroups',
    label: 'Column Groups',
    summary: 'Stacked grouped headers over pinned and center planning fields.',
  },
  {
    key: 'rowGrouping',
    label: 'Row Grouping',
    summary: 'Flat product rows grouped by category and subcategory with collapsible group headers.',
  },
];

interface BomNode {
  id: string;
  material: string;
  description: string;
  qty: number;
  plant: string;
  status: string;
  uom: string;
  children?: BomNode[];
}

const bom: BomNode[] = [
  {
    id: 'FG-1000',
    material: 'FG-1000',
    description: 'Mountain Bike Trail 29',
    qty: 1,
    plant: '1000',
    status: 'Assembly',
    uom: 'EA',
    children: [
      {
        id: 'SA-2000',
        material: 'SA-2000',
        description: 'Frame Assembly',
        qty: 1,
        plant: '1000',
        status: 'Assembly',
        uom: 'EA',
        children: [
          { id: 'PT-3000', material: 'PT-3000', description: 'Front Triangle', qty: 1, plant: '1000', status: 'Released', uom: 'EA' },
          { id: 'PT-3001', material: 'PT-3001', description: 'Rear Triangle', qty: 1, plant: '1000', status: 'Released', uom: 'EA' },
          { id: 'PT-3002', material: 'PT-3002', description: 'Pivot Bearing', qty: 4, plant: '1000', status: 'Released', uom: 'EA' },
        ],
      },
      {
        id: 'SA-2001',
        material: 'SA-2001',
        description: 'Wheel Set',
        qty: 2,
        plant: '1000',
        status: 'Assembly',
        uom: 'EA',
        children: [
          { id: 'PT-3100', material: 'PT-3100', description: 'Rim 29"', qty: 1, plant: '1000', status: 'Released', uom: 'EA' },
          { id: 'PT-3101', material: 'PT-3101', description: 'Spoke', qty: 32, plant: '1000', status: 'Released', uom: 'EA' },
          { id: 'PT-3102', material: 'PT-3102', description: 'Hub', qty: 1, plant: '1000', status: 'Released', uom: 'EA' },
          { id: 'PT-3103', material: 'PT-3103', description: 'Tyre 29x2.4', qty: 1, plant: '1000', status: 'Released', uom: 'EA' },
        ],
      },
      { id: 'PT-2003', material: 'PT-2003', description: 'Handlebar', qty: 1, plant: '1000', status: 'Released', uom: 'EA' },
      { id: 'PT-2004', material: 'PT-2004', description: 'Saddle', qty: 1, plant: '1000', status: 'Released', uom: 'EA' },
    ],
  },
];

const treeData: TreeDataConfig<BomNode> = {
  getRowId: (row) => row.id,
  getChildren: (row) => row.children,
};

const bomColumns: ColumnDef<BomNode>[] = [
  { id: 'material', header: 'Material', accessor: 'material', width: 150, isTreeColumn: true, pin: 'left', filter: 'text' },
  { id: 'description', header: 'Description', accessor: 'description', width: 260, filter: 'text' },
  { id: 'plant', header: 'Plant', accessor: 'plant', width: 100, filter: 'text' },
  { id: 'status', header: 'Status', accessor: 'status', width: 120, filter: 'text' },
  { id: 'qty', header: 'Qty', accessor: 'qty', width: 80, filter: 'number' },
  { id: 'uom', header: 'UoM', accessor: 'uom', width: 80, pin: 'right' },
];

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  subcategory: string;
  planner: string;
  status: string;
  price: number;
  stock: number;
  demand: number;
  uom: string;
}

const products: Product[] = [
  { id: '1', sku: 'EL-1000', name: 'Laptop Pro 16"', category: 'Electronics', subcategory: 'Computers', planner: 'Maya', status: 'Released', price: 1299, stock: 45, demand: 72, uom: 'EA' },
  { id: '2', sku: 'EL-1001', name: 'Laptop Air 13"', category: 'Electronics', subcategory: 'Computers', planner: 'Maya', status: 'Released', price: 999, stock: 120, demand: 160, uom: 'EA' },
  { id: '3', sku: 'EL-1100', name: 'Desktop Workstation', category: 'Electronics', subcategory: 'Computers', planner: 'Noah', status: 'Prototype', price: 2499, stock: 12, demand: 18, uom: 'EA' },
  { id: '4', sku: 'EL-2000', name: 'Noise Cancel Headphones', category: 'Electronics', subcategory: 'Audio', planner: 'Ava', status: 'Released', price: 349, stock: 200, demand: 155, uom: 'EA' },
  { id: '5', sku: 'EL-2001', name: 'Bluetooth Speaker', category: 'Electronics', subcategory: 'Audio', planner: 'Ava', status: 'Released', price: 199, stock: 340, demand: 410, uom: 'EA' },
  { id: '6', sku: 'EL-3000', name: '4K Monitor 27"', category: 'Electronics', subcategory: 'Displays', planner: 'Noah', status: 'Released', price: 449, stock: 67, demand: 94, uom: 'EA' },
  { id: '7', sku: 'FN-1000', name: 'Ergonomic Chair', category: 'Furniture', subcategory: 'Seating', planner: 'Lena', status: 'Released', price: 450, stock: 55, demand: 44, uom: 'EA' },
  { id: '8', sku: 'FN-2000', name: 'Standing Desk', category: 'Furniture', subcategory: 'Desks', planner: 'Lena', status: 'Released', price: 699, stock: 40, demand: 63, uom: 'EA' },
  { id: '9', sku: 'FN-3000', name: 'Monitor Arm', category: 'Furniture', subcategory: 'Accessories', planner: 'Iris', status: 'Released', price: 89, stock: 150, demand: 210, uom: 'EA' },
  { id: '10', sku: 'FN-3001', name: 'Cable Management Kit', category: 'Furniture', subcategory: 'Accessories', planner: 'Iris', status: 'Released', price: 29, stock: 500, demand: 480, uom: 'EA' },
  { id: '11', sku: 'PR-1000', name: 'Mechanical Keyboard', category: 'Peripherals', subcategory: 'Input', planner: 'Maya', status: 'Released', price: 179, stock: 88, demand: 132, uom: 'EA' },
  { id: '12', sku: 'PR-1001', name: 'Wireless Mouse', category: 'Peripherals', subcategory: 'Input', planner: 'Maya', status: 'Released', price: 79, stock: 310, demand: 275, uom: 'EA' },
  { id: '13', sku: 'PR-2000', name: 'Webcam 4K', category: 'Peripherals', subcategory: 'Video', planner: 'Ava', status: 'Released', price: 129, stock: 95, demand: 116, uom: 'EA' },
];

const virtualProducts: Product[] = Array.from({ length: 500 }, (_, index) => {
  const base = products[index % products.length];
  return {
    ...base,
    id: `${base.id}-${index}`,
    sku: `${base.sku}-${String(index + 1).padStart(3, '0')}`,
    stock: base.stock + (index % 17),
    demand: base.demand + (index % 29),
  };
});

const wideColumns: ColumnDef<Product>[] = [
  { id: 'sku', header: 'SKU', accessor: 'sku', width: 140, pin: 'left', filter: 'text' },
  { id: 'name', header: 'Product Name', accessor: 'name', width: 220, filter: 'text' },
  { id: 'category', header: 'Category', accessor: 'category', width: 140, filter: 'text' },
  { id: 'subcategory', header: 'Subcategory', accessor: 'subcategory', width: 150, filter: 'text' },
  { id: 'planner', header: 'Planner', accessor: 'planner', width: 120, filter: 'text' },
  { id: 'status', header: 'Status', accessor: 'status', width: 120, filter: 'text' },
  { id: 'stock', header: 'Stock', accessor: 'stock', width: 100, sortable: true, filter: 'number' },
  { id: 'demand', header: 'Demand', accessor: 'demand', width: 110, sortable: true, filter: 'number' },
  { id: 'price', header: 'Price', accessor: 'price', width: 100, sortable: true, filter: 'number' },
  { id: 'mrp', header: 'MRP Type', accessor: (row) => (row.stock > row.demand ? 'VB' : 'PD'), width: 120, filter: 'text' },
  { id: 'buyer', header: 'Buyer', accessor: (row) => (row.category === 'Furniture' ? 'West' : 'East'), width: 120, filter: 'text' },
  { id: 'leadTime', header: 'Lead Time', accessor: (row) => `${Math.max(2, Math.round(row.price / 200))} d`, width: 120 },
  { id: 'uom', header: 'UoM', accessor: 'uom', width: 80, pin: 'right' },
];

const groupedProductColumns: AnyColumn<Product>[] = [
  {
    groupId: 'identification',
    header: 'Identification',
    columns: [
      { id: 'sku', header: 'SKU', accessor: 'sku', width: 120, pin: 'left', filter: 'text' },
      { id: 'name', header: 'Product Name', accessor: 'name', width: 240, pin: 'left', filter: 'text' },
    ],
  },
  {
    groupId: 'grouping',
    header: 'Grouping',
    columns: [
      { id: 'category', header: 'Category', accessor: 'category', width: 140, filter: 'text' },
      { id: 'subcategory', header: 'Subcategory', accessor: 'subcategory', width: 150, filter: 'text' },
    ],
  },
  {
    groupId: 'planning',
    header: 'Planning',
    columns: [
      { id: 'planner', header: 'Planner', accessor: 'planner', width: 120, filter: 'text' },
      { id: 'status', header: 'Status', accessor: 'status', width: 130, filter: 'text' },
      { id: 'stock', header: 'Stock', accessor: 'stock', width: 100, sortable: true, filter: 'number' },
      { id: 'demand', header: 'Demand', accessor: 'demand', width: 110, sortable: true, filter: 'number' },
    ],
  },
  {
    groupId: 'commercial',
    header: 'Commercial',
    columns: [
      { id: 'price', header: 'Price', accessor: 'price', width: 100, sortable: true, filter: 'number' },
    ],
  },
  { id: 'uom', header: 'UoM', accessor: 'uom', width: 80, pin: 'right' },
];

const groupedBomColumns: AnyColumn<BomNode>[] = [
  {
    groupId: 'identity',
    header: 'Identity',
    columns: [
      { id: 'material', header: 'Material', accessor: 'material', width: 150, isTreeColumn: true, pin: 'left', filter: 'text' },
      { id: 'description', header: 'Description', accessor: 'description', width: 260, filter: 'text' },
    ],
  },
  {
    groupId: 'planning',
    header: 'Planning',
    columns: [
      { id: 'plant', header: 'Plant', accessor: 'plant', width: 100, filter: 'text' },
      { id: 'status', header: 'Status', accessor: 'status', width: 120, filter: 'text' },
      { id: 'qty', header: 'Qty', accessor: 'qty', width: 80, filter: 'number' },
    ],
  },
  { id: 'uom', header: 'UoM', accessor: 'uom', width: 80, pin: 'right' },
];

const selectionConfig: SelectionConfig = {
  mode: 'multi',
  cascade: true,
};

function exampleGrid(
  activeExample: ExampleKey,
  theme: GridTheme,
  onSelectionChange: (selectedIds: string[]) => void,
) {
  switch (activeExample) {
    case 'tree':
      return (
        <DataGrid
          data={bom}
          columns={bomColumns}
          treeData={treeData}
          defaultExpanded
          height={500}
          theme={theme}
        />
      );
    case 'wide':
      return (
        <DataGrid
          data={virtualProducts}
          columns={wideColumns}
          defaultSort={[{ columnId: 'sku', direction: 'asc' }]}
          height={500}
          theme={theme}
        />
      );
    case 'selection':
      return (
        <DataGrid
          data={bom}
          columns={bomColumns}
          treeData={treeData}
          defaultExpanded
          height={500}
          selection={selectionConfig}
          onSelectionChange={(state) => onSelectionChange([...state.selectedIds])}
          theme={theme}
        />
      );
    case 'columnGroups':
      return (
        <DataGrid
          data={bom}
          columns={groupedBomColumns}
          treeData={treeData}
          defaultExpanded
          height={500}
          theme={theme}
        />
      );
    case 'rowGrouping':
      return (
        <DataGrid
          data={products}
          columns={groupedProductColumns}
          groupBy={['category', 'subcategory']}
          defaultExpanded
          defaultSort={[{ columnId: 'price', direction: 'desc' }]}
          height={500}
          theme={theme}
        />
      );
  }
}

export function App() {
  const [activeExample, setActiveExample] = useState<ExampleKey>('tree');
  const [theme, setTheme] = useState<GridTheme>('light');
  const [selectionInfo, setSelectionInfo] = useState('None');
  const isDark = theme === 'dark';
  const active = useMemo(
    () => examples.find((example) => example.key === activeExample) ?? examples[0],
    [activeExample],
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 32,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: isDark ? '#1c1c1e' : '#ffffff',
        color: isDark ? '#f5f5f7' : '#1d1d1f',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Strata Playground</h1>
        <button
          type="button"
          onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
          style={{
            padding: '4px 12px',
            border: `1px solid ${isDark ? '#48484a' : '#d1d1d6'}`,
            borderRadius: 6,
            background: isDark ? '#2c2c2e' : '#f5f5f7',
            color: isDark ? '#f5f5f7' : '#1d1d1f',
            cursor: 'pointer',
          }}
        >
          {isDark ? 'Light' : 'Dark'}
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Playground examples"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: 12,
        }}
      >
        {examples.map((example) => {
          const isSelected = example.key === activeExample;
          return (
            <button
              key={example.key}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveExample(example.key)}
              style={{
                padding: '6px 10px',
                border: `1px solid ${isSelected ? '#0071e3' : isDark ? '#48484a' : '#d1d1d6'}`,
                borderRadius: 6,
                background: isSelected ? '#0071e3' : isDark ? '#2c2c2e' : '#f5f5f7',
                color: isSelected ? '#ffffff' : isDark ? '#f5f5f7' : '#1d1d1f',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {example.label}
            </button>
          );
        })}
      </div>

      <p style={{ color: isDark ? '#98989d' : '#86868b', fontSize: 14, margin: '0 0 8px' }}>
        {active.summary}
      </p>
      {activeExample === 'selection' && (
        <p style={{ color: isDark ? '#98989d' : '#515154', fontSize: 13, margin: '0 0 8px' }}>
          Selection: {selectionInfo}
        </p>
      )}
      <p style={{ color: isDark ? '#98989d' : '#86868b', fontSize: 12, margin: '0 0 20px' }}>
        Click headers to sort, filter buttons to filter, drag header edges to resize, and drag headers to reorder.
      </p>

      {exampleGrid(activeExample, theme, (selectedIds) => {
        setSelectionInfo(selectedIds.length > 0 ? selectedIds.join(', ') : 'None');
      })}
    </div>
  );
}
