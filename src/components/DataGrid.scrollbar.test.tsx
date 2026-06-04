import { render } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Row { id: string; a: string; b: string; }
const data: Row[] = [
  { id: '1', a: 'A1', b: 'B1' },
  { id: '2', a: 'A2', b: 'B2' },
];
const columns: ColumnDef<Row>[] = [
  { id: 'a', header: 'Col A', accessor: 'a' },
  { id: 'b', header: 'Col B', accessor: 'b' },
];

describe('DataGrid — horizontal scrollbar row collapse', () => {
  it('collapses the scrollbar row when there is no overflow (jsdom: no layout)', () => {
    const { container } = render(<DataGrid data={data} columns={columns} />);
    const row = container.querySelector('.strata-horizontal-scrollbar-row');
    expect(row).not.toBeNull();
    expect(row!.classList.contains('strata-horizontal-scrollbar-row--collapsed')).toBe(true);
  });
});
