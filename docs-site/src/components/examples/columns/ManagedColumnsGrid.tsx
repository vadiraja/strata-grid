import { DataGrid, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface Row {
  id: string;
  a: string;
  b: string;
  c: string;
  d: string;
}

const rows: Row[] = Array.from({ length: 50 }, (_, index) => ({
  id: String(index),
  a: `A-${index}`,
  b: `B-${index}`,
  c: `C-${index}`,
  d: `D-${index}`,
}));

const columns: ColumnDef<Row>[] = [
  { id: 'a', header: 'A (pinned left)', accessor: 'a', pin: 'left', width: 140 },
  { id: 'b', header: 'B', accessor: 'b', width: 120 },
  { id: 'c', header: 'C', accessor: 'c', width: 120 },
  { id: 'd', header: 'D (pinned right)', accessor: 'd', pin: 'right', width: 140 },
];

export default function ManagedColumnsGrid() {
  return <DataGrid data={rows} columns={columns} height={300} />;
}
