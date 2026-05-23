import { DataGrid, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface FlatNode {
  id: string;
  parentId: string | null;
  name: string;
  kind: 'folder' | 'file';
}

const data: FlatNode[] = [
  { id: '1', parentId: null, name: 'src', kind: 'folder' },
  { id: '1.1', parentId: '1', name: 'index.ts', kind: 'file' },
  { id: '1.2', parentId: '1', name: 'app.tsx', kind: 'file' },
  { id: '1.3', parentId: '1', name: 'components', kind: 'folder' },
  { id: '1.3.1', parentId: '1.3', name: 'Button.tsx', kind: 'file' },
  { id: '2', parentId: null, name: 'README.md', kind: 'file' },
];

const columns: ColumnDef<FlatNode>[] = [
  { id: 'name', header: 'Name', accessor: 'name', isTreeColumn: true },
  { id: 'kind', header: 'Kind', accessor: 'kind' },
];

export default function FlatTreeGrid() {
  return (
    <DataGrid
      data={data}
      columns={columns}
      height={300}
      treeData={{
        getRowId: (row) => row.id,
        getParentId: (row) => row.parentId,
      }}
      defaultExpanded
    />
  );
}
