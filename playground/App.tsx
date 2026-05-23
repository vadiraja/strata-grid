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

type ExampleKey =
  | 'flat'
  | 'tree'
  | 'wide'
  | 'selection'
  | 'columnGroups'
  | 'rowGrouping'
  | 'editing'
  | 'rowEditing';

interface ExampleConfig {
  key: ExampleKey;
  label: string;
  summary: string;
}

const examples: ExampleConfig[] = [
  {
    key: 'flat',
    label: 'Data Grid',
    summary: 'A regular flat data grid with sorting, filtering, column resize, and reorder.',
  },
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
  {
    key: 'editing',
    label: 'Editing',
    summary: 'Inline text, number, select, date, and checkbox editors with Enter, blur, and Escape handling.',
  },
  {
    key: 'rowEditing',
    label: 'Row Editing',
    summary: 'Row-level editing with Edit, Save, Cancel, and validation-gated commits.',
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
  { id: 'extQty', header: 'Ext Qty', width: 90 },
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
      { id: 'stock', header: 'Stock', accessor: 'stock', width: 100, sortable: true, filter: 'number', aggregate: 'sum' },
      { id: 'demand', header: 'Demand', accessor: 'demand', width: 110, sortable: true, filter: 'number', aggregate: 'sum' },
    ],
  },
  {
    groupId: 'commercial',
    header: 'Commercial',
    columns: [
      {
        id: 'price',
        header: 'Price',
        accessor: 'price',
        width: 100,
        sortable: true,
        filter: 'number',
        aggregate: 'avg',
        aggregateFormatter: (value) =>
          typeof value === 'number' ? `$${value.toFixed(0)}` : '',
      },
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

// --- Flat grid example data ---

interface Employee {
  id: string;
  name: string;
  department: string;
  title: string;
  location: string;
  salary: number;
  startDate: string;
  email: string;
}

const employees: Employee[] = [
  { id: '1', name: 'Alice Chen', department: 'Engineering', title: 'Staff Engineer', location: 'San Francisco', salary: 185000, startDate: '2019-03-15', email: 'alice.chen@acme.io' },
  { id: '2', name: 'Bob Martinez', department: 'Engineering', title: 'Senior Engineer', location: 'Austin', salary: 155000, startDate: '2020-07-01', email: 'bob.martinez@acme.io' },
  { id: '3', name: 'Carol Johnson', department: 'Design', title: 'Design Lead', location: 'New York', salary: 145000, startDate: '2018-11-20', email: 'carol.j@acme.io' },
  { id: '4', name: 'David Kim', department: 'Engineering', title: 'Engineer', location: 'San Francisco', salary: 130000, startDate: '2022-01-10', email: 'david.kim@acme.io' },
  { id: '5', name: 'Eva Müller', department: 'Product', title: 'Product Manager', location: 'Berlin', salary: 140000, startDate: '2021-04-05', email: 'eva.muller@acme.io' },
  { id: '6', name: 'Frank Okafor', department: 'Engineering', title: 'Senior Engineer', location: 'London', salary: 150000, startDate: '2020-09-14', email: 'frank.o@acme.io' },
  { id: '7', name: 'Grace Liu', department: 'Design', title: 'UX Designer', location: 'San Francisco', salary: 125000, startDate: '2022-06-01', email: 'grace.liu@acme.io' },
  { id: '8', name: 'Henry Patel', department: 'Product', title: 'Senior PM', location: 'Austin', salary: 160000, startDate: '2019-08-22', email: 'henry.p@acme.io' },
  { id: '9', name: 'Iris Tanaka', department: 'Engineering', title: 'Engineer', location: 'Tokyo', salary: 120000, startDate: '2023-02-13', email: 'iris.t@acme.io' },
  { id: '10', name: 'James Wilson', department: 'Sales', title: 'Account Executive', location: 'New York', salary: 110000, startDate: '2021-10-01', email: 'james.w@acme.io' },
  { id: '11', name: 'Karen Singh', department: 'Engineering', title: 'Tech Lead', location: 'Austin', salary: 170000, startDate: '2018-05-07', email: 'karen.s@acme.io' },
  { id: '12', name: 'Leo Rossi', department: 'Sales', title: 'Sales Manager', location: 'London', salary: 135000, startDate: '2020-01-20', email: 'leo.r@acme.io' },
  { id: '13', name: 'Mia Thompson', department: 'Design', title: 'Senior Designer', location: 'Berlin', salary: 138000, startDate: '2019-12-03', email: 'mia.t@acme.io' },
  { id: '14', name: 'Noah Garcia', department: 'Engineering', title: 'Principal Engineer', location: 'San Francisco', salary: 210000, startDate: '2017-06-15', email: 'noah.g@acme.io' },
  { id: '15', name: 'Olivia Brown', department: 'Product', title: 'Director of Product', location: 'New York', salary: 195000, startDate: '2018-02-28', email: 'olivia.b@acme.io' },
];

const employeeColumns: ColumnDef<Employee>[] = [
  { id: 'name', header: 'Name', accessor: 'name', width: 180, filter: 'text' },
  { id: 'department', header: 'Department', accessor: 'department', width: 140, filter: 'text' },
  { id: 'title', header: 'Title', accessor: 'title', width: 180, filter: 'text' },
  { id: 'location', header: 'Location', accessor: 'location', width: 140, filter: 'text' },
  { id: 'salary', header: 'Salary', accessor: (row) => `$${row.salary.toLocaleString()}`, width: 120, sortable: true, filter: 'number' },
  { id: 'startDate', header: 'Start Date', accessor: 'startDate', width: 120, sortable: true },
  { id: 'email', header: 'Email', accessor: 'email', width: 200 },
];

interface EditableTask {
  id: string;
  item: string;
  owner: string;
  status: 'Draft' | 'In Review' | 'Released' | 'Blocked';
  dueDate: string;
  qty: number;
  approved: boolean;
}

const initialEditableTasks: EditableTask[] = [
  { id: 'task-1', item: 'Frame tolerance review', owner: 'Maya', status: 'In Review', dueDate: '2026-06-03', qty: 12, approved: false },
  { id: 'task-2', item: 'Supplier sample order', owner: 'Noah', status: 'Draft', dueDate: '2026-06-07', qty: 6, approved: false },
  { id: 'task-3', item: 'Release wheel spec', owner: 'Ava', status: 'Released', dueDate: '2026-06-12', qty: 24, approved: true },
  { id: 'task-4', item: 'Blocked bearing change', owner: 'Lena', status: 'Blocked', dueDate: '2026-06-18', qty: 4, approved: false },
  { id: 'task-5', item: 'Packaging signoff', owner: 'Iris', status: 'In Review', dueDate: '2026-06-21', qty: 18, approved: true },
];

const editableTaskColumns: ColumnDef<EditableTask>[] = [
  { id: 'item', header: 'Item', accessor: 'item', width: 220, filter: 'text', editable: true, editorType: 'text' },
  { id: 'owner', header: 'Owner', accessor: 'owner', width: 120, filter: 'text', editable: true, editorType: 'text' },
  {
    id: 'status',
    header: 'Status',
    accessor: 'status',
    width: 130,
    filter: 'text',
    editable: true,
    editorType: 'select',
    editorOptions: {
      choices: ['Draft', 'In Review', 'Released', 'Blocked'],
    },
  },
  { id: 'dueDate', header: 'Due Date', accessor: 'dueDate', width: 130, editable: true, editorType: 'date' },
  { id: 'qty', header: 'Qty', accessor: 'qty', width: 90, filter: 'number', editable: true, editorType: 'number' },
  { id: 'approved', header: 'Approved', accessor: 'approved', width: 110, editable: true, editorType: 'checkbox' },
];

interface PlaygroundCellEditEndEvent {
  rowId: string;
  columnId: string;
  value: unknown;
  newValue: unknown;
  committed: boolean;
}

interface PlaygroundRowEditEndEvent {
  rowId: string;
  changes: Record<string, { oldValue: unknown; newValue: unknown }>;
  committed: boolean;
}

function exampleGrid(
  activeExample: ExampleKey,
  theme: GridTheme,
  onSelectionChange: (selectedIds: string[]) => void,
  editableTasks: EditableTask[],
  onTaskEditEnd: (event: PlaygroundCellEditEndEvent) => void,
  onTaskRowEditEnd: (event: PlaygroundRowEditEndEvent) => void,
) {
  switch (activeExample) {
    case 'flat':
      return (
        <DataGrid
          key="flat"
          data={employees}
          columns={employeeColumns}
          defaultSort={[{ columnId: 'name', direction: 'asc' }]}
          height={500}
          theme={theme}
        />
      );
    case 'tree':
      return (
        <DataGrid
          key="tree"
          data={bom}
          columns={bomColumns}
          treeData={treeData}
          defaultExpanded
          aggregation={{
            extendedQuantity: {
              sourceColumn: 'qty',
              targetColumn: 'extQty',
              compute: 'multiply-down',
            },
          }}
          height={500}
          theme={theme}
        />
      );
    case 'wide':
      return (
        <DataGrid
          key="wide"
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
          key="selection"
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
          key="column-groups"
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
          key="row-grouping"
          data={products}
          columns={groupedProductColumns}
          groupBy={['category', 'subcategory']}
          aggregation={{ showFooterAggregates: true }}
          defaultExpanded
          defaultSort={[{ columnId: 'price', direction: 'desc' }]}
          height={500}
          theme={theme}
        />
      );
    case 'editing':
      return (
        <DataGrid
          key="editing"
          data={editableTasks}
          columns={editableTaskColumns}
          height={500}
          theme={theme}
          editable={{ mode: 'cell' }}
          onCellEditEnd={onTaskEditEnd}
        />
      );
    case 'rowEditing':
      return (
        <DataGrid
          key="row-editing"
          data={editableTasks}
          columns={editableTaskColumns}
          height={500}
          theme={theme}
          editable={{ mode: 'row' }}
          onRowEditEnd={onTaskRowEditEnd}
        />
      );
  }
}

export function App() {
  const [activeExample, setActiveExample] = useState<ExampleKey>('flat');
  const [theme, setTheme] = useState<GridTheme>('light');
  const [selectionInfo, setSelectionInfo] = useState('None');
  const [editableTasks, setEditableTasks] = useState(initialEditableTasks);
  const [editInfo, setEditInfo] = useState('None');
  const isDark = theme === 'dark';
  const active = useMemo(
    () => examples.find((example) => example.key === activeExample) ?? examples[0],
    [activeExample],
  );

  function handleTaskEditEnd(event: PlaygroundCellEditEndEvent) {
    const task = editableTasks[Number(event.rowId)];

    if (!event.committed) {
      setEditInfo(`Discarded ${event.columnId} on ${task?.item ?? event.rowId}`);
      return;
    }

    setEditableTasks((current) =>
      current.map((currentTask, index) =>
        String(index) === event.rowId
          ? { ...currentTask, [event.columnId]: event.newValue }
          : currentTask,
      ),
    );
    setEditInfo(`${task?.item ?? event.rowId}: ${event.columnId} -> ${String(event.newValue)}`);
  }

  function handleTaskRowEditEnd(event: PlaygroundRowEditEndEvent) {
    const task = editableTasks[Number(event.rowId)];

    if (!event.committed) {
      setEditInfo(`Discarded row edits on ${task?.item ?? event.rowId}`);
      return;
    }

    setEditableTasks((current) =>
      current.map((currentTask, index) => {
        if (String(index) !== event.rowId) return currentTask;

        return Object.entries(event.changes).reduce(
          (updatedTask, [columnId, change]) => ({
            ...updatedTask,
            [columnId]: change.newValue,
          }),
          currentTask,
        );
      }),
    );

    const changedColumns = Object.keys(event.changes);
    setEditInfo(
      `${task?.item ?? event.rowId}: ${changedColumns.length} row change${
        changedColumns.length === 1 ? '' : 's'
      } saved`,
    );
  }

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
      {(activeExample === 'editing' || activeExample === 'rowEditing') && (
        <p style={{ color: isDark ? '#98989d' : '#515154', fontSize: 13, margin: '0 0 8px' }}>
          Last edit: {editInfo}
        </p>
      )}
      <p style={{ color: isDark ? '#98989d' : '#86868b', fontSize: 12, margin: '0 0 20px' }}>
        {activeExample === 'editing'
          ? 'Double-click editable cells to edit. Enter or blur commits; Escape discards.'
          : activeExample === 'rowEditing'
            ? 'Click Edit on a row, update multiple cells, then Save or Cancel.'
          : 'Click headers to sort, filter buttons to filter, drag header edges to resize, and drag headers to reorder.'}
      </p>

      {exampleGrid(activeExample, theme, (selectedIds) => {
        setSelectionInfo(selectedIds.length > 0 ? selectedIds.join(', ') : 'None');
      }, editableTasks, handleTaskEditEnd, handleTaskRowEditEnd)}
    </div>
  );
}
