import { useMemo } from 'react';
import { DataGrid, InMemoryDataSource, useDataSource, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface Row {
  id: string;
  name: string;
  qty: number;
}

const seed: Row[] = Array.from({ length: 20 }, (_, index) => ({
  id: String(index),
  name: `Item ${index}`,
  qty: (index % 7) + 1,
}));

export default function InMemoryExample() {
  const source = useMemo(() => new InMemoryDataSource<Row>(seed), []);
  const dataSource = useDataSource(source);

  const columns: ColumnDef<Row>[] = [
    { id: 'name', header: 'Name', accessor: 'name', filter: 'text' },
    { id: 'qty', header: 'Qty', accessor: 'qty', filter: 'number' },
  ];

  return <DataGrid data={dataSource.data} columns={columns} height={260} />;
}
