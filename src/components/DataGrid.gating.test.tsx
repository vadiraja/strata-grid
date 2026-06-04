import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Row { id: string; a: string; }
const data: Row[] = [{ id: '1', a: 'A1' }];
const columns: ColumnDef<Row>[] = [{ id: 'a', header: 'A', accessor: 'a', editable: true }];

describe('DataGrid — edit-mode gate', () => {
  it('shows the editable indicator when editing is on (default)', () => {
    const { container } = render(<DataGrid data={data} columns={columns} editable={{}} />);
    expect(container.querySelector('.strata-cell-editable')).not.toBeNull();
  });

  it('hides the indicator and blocks activation when editing={false}', () => {
    const onStart = vi.fn();
    const { container } = render(
      <DataGrid data={data} columns={columns} editable={{}} editing={false} onCellEditStart={onStart} />,
    );
    expect(container.querySelector('.strata-cell-editable')).toBeNull();
    const cell = container.querySelector('.strata-cell');
    if (cell) fireEvent.doubleClick(cell);
    expect(onStart).not.toHaveBeenCalled();
    expect(container.querySelector('.strata-cell-editor-container')).toBeNull();
  });

  it('hides the indicator when showEditableIndicator is false but still allows activation', () => {
    const onStart = vi.fn();
    const { container } = render(
      <DataGrid data={data} columns={columns} editable={{ showEditableIndicator: false, activateOn: 'doubleClick' }} onCellEditStart={onStart} />,
    );
    expect(container.querySelector('.strata-cell-editable')).toBeNull();
    fireEvent.doubleClick(container.querySelector('.strata-cell')!);
    expect(onStart).toHaveBeenCalled();
  });

  it('renders a controlled toggle that calls onEditingChange', () => {
    const onEditingChange = vi.fn();
    const { getByRole } = render(
      <DataGrid data={data} columns={columns} editable={{}} editing={false} showEditToggle onEditingChange={onEditingChange} />,
    );
    fireEvent.click(getByRole('button', { name: /edit/i }));
    expect(onEditingChange).toHaveBeenCalledWith(true);
  });
});
