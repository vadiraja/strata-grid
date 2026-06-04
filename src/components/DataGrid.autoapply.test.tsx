import { render, fireEvent } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Row { id: string; a: string; }
const columns: ColumnDef<Row>[] = [{ id: 'a', header: 'A', accessor: 'a', editable: true }];

it('autoApply emits a new data array on cell commit', () => {
  const data: Row[] = [{ id: '1', a: 'A1' }];
  const onDataChange = vi.fn();
  const { container, getByDisplayValue } = render(
    <DataGrid data={data} columns={columns} editable={{ activateOn: 'doubleClick' }}
      autoApply getRowId={(r) => r.id} onDataChange={onDataChange} />,
  );
  fireEvent.doubleClick(container.querySelector('.strata-cell')!);
  const input = getByDisplayValue('A1') as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'A2' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onDataChange).toHaveBeenCalledTimes(1);
  expect(onDataChange.mock.calls[0][0]).toEqual([{ id: '1', a: 'A2' }]);
});

it('autoApply applies a lookup cascade in one emission', async () => {
  const { waitFor } = await import('@testing-library/react');
  interface PRow { id: string; part: unknown; desc: string; }
  const pdata: PRow[] = [{ id: '1', part: null, desc: '' }];
  const pcolumns: ColumnDef<PRow>[] = [
    { id: 'part', header: 'Part', accessor: 'part', editable: true, editorType: 'lookup',
      lookup: { search: async () => [{ id: 'p1', label: 'Bolt', description: 'Hex' }], map: { description: 'desc' } } },
    { id: 'desc', header: 'Desc', accessor: 'desc', editable: true },
  ];
  const onDataChange = vi.fn();
  const { container } = render(
    <DataGrid data={pdata} columns={pcolumns} editable={{ activateOn: 'doubleClick' }}
      autoApply getRowId={(r) => r.id} onDataChange={onDataChange} />,
  );
  fireEvent.doubleClick(container.querySelector('.strata-cell')!);
  fireEvent.change(container.querySelector('.strata-lookup-input') as HTMLInputElement, { target: { value: 'bo' } });
  await waitFor(() => expect(container.querySelector('.strata-lookup-option')).not.toBeNull());
  fireEvent.click(container.querySelector('.strata-lookup-option')!);
  await waitFor(() => expect(onDataChange).toHaveBeenCalled());
  const calls = onDataChange.mock.calls;
  const last = calls[calls.length - 1][0];
  expect(last[0].part).toEqual({ id: 'p1', label: 'Bolt' });
  expect(last[0].desc).toBe('Hex');
});

it('does NOT emit onDataChange when autoApply is off', () => {
  const data: Row[] = [{ id: '1', a: 'A1' }];
  const onDataChange = vi.fn();
  const { container, getByDisplayValue } = render(
    <DataGrid data={data} columns={columns} editable={{ activateOn: 'doubleClick' }} onDataChange={onDataChange} />,
  );
  fireEvent.doubleClick(container.querySelector('.strata-cell')!);
  fireEvent.change(getByDisplayValue('A1'), { target: { value: 'A2' } });
  fireEvent.keyDown(getByDisplayValue('A2'), { key: 'Enter' });
  expect(onDataChange).not.toHaveBeenCalled();
});
