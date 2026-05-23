import { DataGrid, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface FileNode {
  id: string;
  name: string;
  kind: 'folder' | 'file';
  size: number;
  children?: FileNode[];
}

const data: FileNode[] = [
  {
    id: '1',
    name: 'src',
    kind: 'folder',
    size: 0,
    children: [
      { id: '1.1', name: 'index.ts', kind: 'file', size: 1200 },
      { id: '1.2', name: 'app.tsx', kind: 'file', size: 4096 },
      {
        id: '1.3',
        name: 'components',
        kind: 'folder',
        size: 0,
        children: [
          { id: '1.3.1', name: 'Button.tsx', kind: 'file', size: 800 },
          { id: '1.3.2', name: 'Modal.tsx', kind: 'file', size: 1600 },
        ],
      },
    ],
  },
  { id: '2', name: 'README.md', kind: 'file', size: 5300 },
];

const columns: ColumnDef<FileNode>[] = [
  { id: 'name', header: 'Name', accessor: 'name', isTreeColumn: true },
  { id: 'kind', header: 'Kind', accessor: 'kind' },
  { id: 'size', header: 'Size', accessor: 'size' },
];

export default function TreeGrid() {
  return (
    <DataGrid
      data={data}
      columns={columns}
      height={350}
      treeData={{
        getRowId: (row) => row.id,
        getChildren: (row) => row.children,
      }}
      defaultExpanded
    />
  );
}
