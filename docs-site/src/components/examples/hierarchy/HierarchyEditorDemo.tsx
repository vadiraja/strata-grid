import { useMemo, useState } from 'react';
import {
  DataGrid,
  buildTreeState,
  useTreeEditor,
  type ColumnDef,
  type TreeState,
} from 'strata-grid';
import 'strata-grid/styles.css';

interface Node {
  id: string;
  parentId: string | null;
  label: string;
}

const seed: Node[] = [
  { id: '1', parentId: null, label: 'Root' },
  { id: '1.1', parentId: '1', label: 'Child A' },
  { id: '1.2', parentId: '1', label: 'Child B' },
];

function flattenState(state: TreeState<Node>): Node[] {
  const rows: Node[] = [];

  const visit = (id: string) => {
    const node = state.nodes.get(id);
    if (!node) return;
    rows.push({ ...node.data, parentId: node.parentId });
    node.childIds.forEach(visit);
  };

  state.rootIds.forEach(visit);
  return rows;
}

export default function HierarchyEditorDemo() {
  const initialState = useMemo(
    () =>
      buildTreeState(seed, {
        getRowId: (row) => row.id,
        getParentId: (row) => row.parentId,
      }),
    [],
  );
  const [idCounter, setIdCounter] = useState(3);
  const editor = useTreeEditor<Node>({
    initialState,
    generateId: () => {
      const next = idCounter + 1;
      setIdCounter(next);
      return `1.${next}`;
    },
    createNode: (parentId) => ({
      id: '',
      parentId,
      label: 'New child',
    }),
  });

  const rows = useMemo(() => flattenState(editor.state), [editor.state]);
  const columns: ColumnDef<Node>[] = [
    { id: 'label', header: 'Label', accessor: 'label', isTreeColumn: true },
  ];

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => editor.addNode('1')}>Add child</button>
        <button type="button" onClick={() => editor.indentNode('1.2')}>Indent Child B</button>
        <button type="button" onClick={() => editor.undo()} disabled={!editor.canUndo}>Undo</button>
        <button type="button" onClick={() => editor.redo()} disabled={!editor.canRedo}>Redo</button>
      </div>
      <DataGrid
        data={rows}
        columns={columns}
        height={260}
        treeData={{ getRowId: (row) => row.id, getParentId: (row) => row.parentId }}
        defaultExpanded
      />
    </div>
  );
}
