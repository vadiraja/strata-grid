import { useEffect, useMemo, useState } from 'react';
import { DataGrid, createTheme, type ColumnDef, type GridTheme } from 'strata-grid';
import 'strata-grid/styles.css';
import 'strata-grid/theme/tokens.css';
import 'strata-grid/theme/dark.css';

interface Row {
  id: string;
  name: string;
  qty: number;
}

const rows: Row[] = [
  { id: '1', name: 'Alpha', qty: 1 },
  { id: '2', name: 'Bravo', qty: 2 },
];

const columns: ColumnDef<Row>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'qty', header: 'Qty', accessor: 'qty' },
];

export default function ThemedGrid() {
  const [base, setBase] = useState<'light' | 'dark'>('light');
  const composed = useMemo(
    () =>
      createTheme(base as GridTheme, {
        tokens: { '--strata-accent': '#7c3aed' },
      }),
    [base],
  );

  useEffect(() => () => composed.dispose(), [composed]);

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <button type="button" onClick={() => setBase((value) => (value === 'light' ? 'dark' : 'light'))}>
        Toggle base theme ({base})
      </button>
      <DataGrid
        data={rows}
        columns={columns}
        height={200}
        theme={composed.className}
        density="comfortable"
        striped
        transitions
        appearance={{ gridLines: 'both' }}
      />
    </div>
  );
}
