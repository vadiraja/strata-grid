import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Row { id: string; a: string; }
const data: Row[] = [{ id: '1', a: 'A1' }];
const columns: ColumnDef<Row>[] = [
  { id: 'a', header: 'A', accessor: 'a', editable: true, editSurface: 'modal' },
];

describe('DataGrid — modal editor surface', () => {
  it('opens a dialog instead of an inline editor for a modal column', () => {
    const { container, queryByRole } = render(
      <DataGrid data={data} columns={columns} editable={{ activateOn: 'doubleClick' }} />,
    );
    fireEvent.doubleClick(container.querySelector('.strata-cell')!);
    expect(container.querySelector('.strata-cell-editor-container')).toBeNull();
    expect(queryByRole('dialog')).not.toBeNull();
  });
});
