import { useMemo, useState } from 'react';
import { DataGrid, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface Task {
  id: string;
  title: string;
  hours: number;
  done: boolean;
}

const initial: Task[] = [
  { id: '1', title: 'Write spec', hours: 2, done: true },
  { id: '2', title: 'Write plan', hours: 1.5, done: false },
  { id: '3', title: 'Implement', hours: 6, done: false },
];

export default function EditableGrid() {
  const [rows, setRows] = useState(initial);

  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      { id: 'title', header: 'Title', accessor: 'title', editable: true, editorType: 'text' },
      {
        id: 'hours',
        header: 'Hours',
        accessor: 'hours',
        editable: true,
        editorType: 'number',
        validate: (value) =>
          Number(value) >= 0 ? true : 'Hours must be zero or greater.',
      },
      { id: 'done', header: 'Done', accessor: 'done', editable: true, editorType: 'checkbox' },
    ],
    [],
  );

  return (
    <DataGrid
      data={rows}
      columns={columns}
      height={260}
      editable={{ mode: 'cell', activateOn: 'doubleClick' }}
      onCellEditEnd={(event) => {
        if (!event.committed) return;
        setRows((previous) =>
          previous.map((row) =>
            row.id === event.rowId
              ? { ...row, [event.columnId]: event.newValue }
              : row,
          ),
        );
      }}
    />
  );
}
