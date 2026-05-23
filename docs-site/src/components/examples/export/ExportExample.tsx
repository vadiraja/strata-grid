import { DataGrid, ExportMenu, useExport, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface Row {
  id: string;
  name: string;
  qty: number;
}

const rows: Row[] = [
  { id: '1', name: 'Alpha', qty: 1 },
  { id: '2', name: 'Bravo', qty: 2 },
  { id: '3', name: 'Charlie', qty: 3 },
];

const columns: ColumnDef<Row>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'qty', header: 'Qty', accessor: 'qty' },
];

const exportColumns = [
  { id: 'name', header: 'Name' },
  { id: 'qty', header: 'Qty' },
];

export default function ExportExample() {
  const exportApi = useExport<Row>({
    getVisibleRows: () => rows,
    getAllRows: () => rows,
    getSelectedRows: () => [],
    columns: exportColumns,
    getRowValue: (row, columnId) => String(row[columnId as keyof Row] ?? ''),
  });

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <ExportMenu
        formats={['csv', 'xlsx']}
        onExport={(format) =>
          void exportApi.exportData({ format, scope: 'visible', filename: 'rows' })
        }
      />
      <DataGrid data={rows} columns={columns} height={200} />
    </div>
  );
}
