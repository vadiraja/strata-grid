import { DataGrid, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface Person {
  id: string;
  name: string;
  role: string;
}

const columns: ColumnDef<Person>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'role', header: 'Role', accessor: 'role' },
];

const data: Person[] = [
  { id: '1', name: 'Ada Lovelace', role: 'Engineer' },
  { id: '2', name: 'Alan Turing', role: 'Architect' },
];

export default function SmokeTestGrid() {
  return <DataGrid data={data} columns={columns} height={200} />;
}
