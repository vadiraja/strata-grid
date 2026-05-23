import { DataGrid, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface Part {
  id: string;
  partNumber: string;
  qty: number;
  children?: Part[];
}

const data: Part[] = [
  {
    id: '1',
    partNumber: 'A-100',
    qty: 1,
    children: [
      { id: '1.1', partNumber: 'B-201', qty: 2 },
      { id: '1.2', partNumber: 'B-202', qty: 3 },
    ],
  },
  {
    id: '2',
    partNumber: 'A-110',
    qty: 1,
    children: [{ id: '2.1', partNumber: 'B-301', qty: 4 }],
  },
];

const columns: ColumnDef<Part>[] = [
  { id: 'partNumber', header: 'Part #', accessor: 'partNumber', isTreeColumn: true, filter: 'text' },
  { id: 'qty', header: 'Qty', accessor: 'qty', filter: 'number' },
];

export default function SortableGrid() {
  return (
    <DataGrid
      data={data}
      columns={columns}
      height={320}
      treeData={{ getRowId: (row) => row.id, getChildren: (row) => row.children }}
      defaultExpanded
      defaultSort={[{ columnId: 'partNumber', direction: 'asc' }]}
    />
  );
}
