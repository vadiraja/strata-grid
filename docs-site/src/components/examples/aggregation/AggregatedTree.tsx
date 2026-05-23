import { DataGrid, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface Part {
  id: string;
  partNumber: string;
  qty: number;
  cost: number;
  children?: Part[];
}

const data: Part[] = [
  {
    id: '1',
    partNumber: 'A-100',
    qty: 1,
    cost: 0,
    children: [
      { id: '1.1', partNumber: 'B-201', qty: 2, cost: 5 },
      { id: '1.2', partNumber: 'B-202', qty: 3, cost: 7 },
    ],
  },
];

const columns: ColumnDef<Part>[] = [
  { id: 'partNumber', header: 'Part #', accessor: 'partNumber', isTreeColumn: true },
  { id: 'qty', header: 'Qty', accessor: 'qty', aggregate: 'sum' },
  { id: 'cost', header: 'Cost', accessor: 'cost', aggregate: 'sum' },
];

export default function AggregatedTree() {
  return (
    <DataGrid
      data={data}
      columns={columns}
      height={240}
      treeData={{ getRowId: (row) => row.id, getChildren: (row) => row.children }}
      defaultExpanded
      aggregation={{ showParentAggregates: true, showFooterAggregates: true }}
    />
  );
}
