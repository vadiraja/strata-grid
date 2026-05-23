import { DataGrid, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface Person {
  id: string;
  name: string;
  role: string;
  level: number;
}

const columns: ColumnDef<Person>[] = [
  { id: 'name', header: 'Name', accessor: 'name', filter: 'text' },
  { id: 'role', header: 'Role', accessor: 'role', filter: 'text' },
  { id: 'level', header: 'Level', accessor: 'level', filter: 'number' },
];

const data: Person[] = [
  { id: '1', name: 'Ada Lovelace', role: 'Engineer', level: 5 },
  { id: '2', name: 'Alan Turing', role: 'Architect', level: 6 },
  { id: '3', name: 'Grace Hopper', role: 'Engineer', level: 5 },
  { id: '4', name: 'Hedy Lamarr', role: 'Researcher', level: 4 },
];

export default function FlatGrid() {
  return (
    <DataGrid
      data={data}
      columns={columns}
      height={300}
      defaultSort={[{ columnId: 'name', direction: 'asc' }]}
    />
  );
}
