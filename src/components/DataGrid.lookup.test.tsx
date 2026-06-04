import { render, fireEvent, waitFor } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Row {
  id: string;
  part: unknown;
  desc: string;
  uom: string;
}
const data: Row[] = [{ id: '1', part: null, desc: '', uom: '' }];

it('cascade-fills sibling columns as one transaction', async () => {
  const onCellsChange = vi.fn();
  const columns: ColumnDef<Row>[] = [
    {
      id: 'part',
      header: 'Part',
      accessor: 'part',
      editable: true,
      editorType: 'lookup',
      lookup: {
        search: async () => [
          { id: 'p1', label: 'Bolt', description: 'Hex bolt', uom: 'EA' },
        ],
        map: { description: 'desc', uom: 'uom' },
      },
    },
    { id: 'desc', header: 'Desc', accessor: 'desc', editable: true },
    { id: 'uom', header: 'UOM', accessor: 'uom', editable: true },
  ];
  const { container } = render(
    <DataGrid
      data={data}
      columns={columns}
      editable={{ activateOn: 'doubleClick' }}
      onCellsChange={onCellsChange}
    />,
  );
  fireEvent.doubleClick(container.querySelector('.strata-cell')!);
  const input = container.querySelector('.strata-lookup-input') as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'bo' } });
  await waitFor(() =>
    expect(container.querySelector('.strata-lookup-option')).not.toBeNull(),
  );
  fireEvent.click(container.querySelector('.strata-lookup-option')!);
  await waitFor(() => expect(onCellsChange).toHaveBeenCalledTimes(1));
  const evt = onCellsChange.mock.calls[0][0];
  expect(evt.source).toBe('lookup');
  const byCol = Object.fromEntries(
    evt.edits.map((e: { columnId: string; newValue: unknown }) => [
      e.columnId,
      e.newValue,
    ]),
  );
  expect(byCol.part).toEqual({ id: 'p1', label: 'Bolt' });
  expect(byCol.desc).toBe('Hex bolt');
  expect(byCol.uom).toBe('EA');
});
