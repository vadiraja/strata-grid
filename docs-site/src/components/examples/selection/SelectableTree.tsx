import { useState } from 'react';
import { DataGrid, type ColumnDef, type SelectionState } from 'strata-grid';
import 'strata-grid/styles.css';

interface Node {
  id: string;
  label: string;
  children?: Node[];
}

const data: Node[] = [
  {
    id: '1',
    label: 'Group A',
    children: [
      { id: '1.1', label: 'Item A1' },
      { id: '1.2', label: 'Item A2' },
    ],
  },
  {
    id: '2',
    label: 'Group B',
    children: [{ id: '2.1', label: 'Item B1' }],
  },
];

const columns: ColumnDef<Node>[] = [
  { id: 'label', header: 'Label', accessor: 'label', isTreeColumn: true },
];

export default function SelectableTree() {
  const [selectedCount, setSelectedCount] = useState(0);

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <p style={{ margin: 0 }}>Selected rows: {selectedCount}</p>
      <DataGrid
        data={data}
        columns={columns}
        height={280}
        treeData={{ getRowId: (row) => row.id, getChildren: (row) => row.children }}
        defaultExpanded
        selection={{ mode: 'multi', cascade: true }}
        onSelectionChange={(state: SelectionState) => setSelectedCount(state.selectedIds.size)}
      />
    </div>
  );
}
