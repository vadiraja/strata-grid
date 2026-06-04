import { render, fireEvent } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Row { id: string; a: string; }
const columns: ColumnDef<Row>[] = [{ id: 'a', header: 'A', accessor: 'a', editable: true }];

it('Ctrl+Z reverts the last cell edit in autoApply mode', () => {
  const onDataChange = vi.fn();
  let data: Row[] = [{ id: '1', a: 'A1' }];
  const { container, getByDisplayValue, rerender } = render(
    <DataGrid data={data} columns={columns} editable={{ activateOn: 'doubleClick' }}
      autoApply getRowId={(r) => r.id} onDataChange={(next) => { data = next; onDataChange(next); }} />,
  );
  fireEvent.doubleClick(container.querySelector('.strata-cell')!);
  fireEvent.change(getByDisplayValue('A1'), { target: { value: 'A2' } });
  fireEvent.keyDown(getByDisplayValue('A2'), { key: 'Enter' });
  rerender(<DataGrid data={data} columns={columns} editable={{ activateOn: 'doubleClick' }}
    autoApply getRowId={(r) => r.id} onDataChange={(next) => { data = next; onDataChange(next); }} />);
  // undo via Ctrl+Z on the grid root
  fireEvent.keyDown(container.querySelector('.strata-grid')!, { key: 'z', ctrlKey: true });
  expect(onDataChange).toHaveBeenLastCalledWith([{ id: '1', a: 'A1' }]);
});

it('controlled mode: undo reverts via onCellsChange seam', () => {
  let data: { id: string; a: string }[] = [{ id: '1', a: 'A1' }];
  const cols = [{ id: 'a', header: 'A', accessor: 'a', editable: true }] as any;
  const apply = (e: any) => {
    // canonical controlled apply seam
    data = data.map((r) => r.id === '1' ? { ...r, ...Object.fromEntries(e.edits.map((d: any) => [d.columnId, d.newValue])) } : r);
  };
  const onCellsChange = vi.fn(apply);
  const { container, getByDisplayValue, rerender, unmount } = render(
    <DataGrid data={data} columns={cols} editable={{ activateOn: 'doubleClick' }} onCellsChange={onCellsChange} />,
  );
  fireEvent.doubleClick(container.querySelector('.strata-cell')!);
  fireEvent.change(getByDisplayValue('A1'), { target: { value: 'A2' } });
  fireEvent.keyDown(getByDisplayValue('A2'), { key: 'Enter' });
  // forward edit emitted onCellsChange(source 'edit')
  expect(onCellsChange).toHaveBeenCalledWith(expect.objectContaining({ source: 'edit' }));
  expect(data[0].a).toBe('A2');
  rerender(<DataGrid data={data} columns={cols} editable={{ activateOn: 'doubleClick' }} onCellsChange={onCellsChange} />);
  fireEvent.keyDown(container.querySelector('.strata-grid')!, { key: 'z', ctrlKey: true });
  expect(onCellsChange).toHaveBeenCalledWith(expect.objectContaining({ source: 'undo' }));
  expect(data[0].a).toBe('A1');
  unmount();
});
