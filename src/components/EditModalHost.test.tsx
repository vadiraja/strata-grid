import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Row { id: string; a: string; }
const data: Row[] = [{ id: '1', a: 'A1' }];
const columns: ColumnDef<Row>[] = [
  { id: 'a', header: 'A', accessor: 'a', editable: true, editSurface: 'modal' },
];
const open = (c: HTMLElement) => fireEvent.doubleClick(c.querySelector('.strata-cell')!);

describe('EditModalHost', () => {
  it('commits the new value on Save', () => {
    const onCellEditEnd = vi.fn();
    const { container, getByRole, getByDisplayValue } = render(
      <DataGrid data={data} columns={columns} editable={{}} onCellEditEnd={onCellEditEnd} />,
    );
    open(container);
    fireEvent.change(getByDisplayValue('A1'), { target: { value: 'A2' } });
    fireEvent.click(getByRole('button', { name: /save/i }));
    expect(onCellEditEnd).toHaveBeenCalledWith(
      expect.objectContaining({ columnId: 'a', newValue: 'A2', committed: true }),
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('discards on Cancel', () => {
    const onCellEditEnd = vi.fn();
    const { container, getByRole } = render(
      <DataGrid data={data} columns={columns} editable={{}} onCellEditEnd={onCellEditEnd} />,
    );
    open(container);
    fireEvent.click(getByRole('button', { name: /cancel/i }));
    expect(onCellEditEnd).toHaveBeenCalledWith(expect.objectContaining({ committed: false }));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
