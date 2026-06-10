import { render } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Row {
  id: string;
  name: string;
  value: number;
}

const data: Row[] = [
  { id: '1', name: 'Alpha', value: 10 },
  { id: '2', name: 'Beta', value: 20 },
];

const columns: ColumnDef<Row>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'value', header: 'Value', accessor: 'value' },
];

describe('DataGrid — appearance prop', () => {
  it('defaults gridLines to horizontal when appearance is omitted', () => {
    const { container } = render(<DataGrid data={data} columns={columns} />);
    expect(container.querySelector('.strata-grid')).toHaveAttribute(
      'data-strata-gridlines',
      'horizontal',
    );
  });

  it('reflects gridLines in the data-strata-gridlines attribute', () => {
    const { container } = render(
      <DataGrid data={data} columns={columns} appearance={{ gridLines: 'none' }} />,
    );
    expect(container.querySelector('.strata-grid')).toHaveAttribute(
      'data-strata-gridlines',
      'none',
    );
  });

  it('round-trips the vertical gridLines value to the attribute', () => {
    const { container } = render(
      <DataGrid data={data} columns={columns} appearance={{ gridLines: 'vertical' }} />,
    );
    expect(container.querySelector('.strata-grid')).toHaveAttribute(
      'data-strata-gridlines',
      'vertical',
    );
  });

  it('emits CSS custom properties only for provided appearance fields', () => {
    const { container } = render(
      <DataGrid
        data={data}
        columns={columns}
        appearance={{ rowHeight: 48, borderColor: '#abcdef' }}
      />,
    );
    const grid = container.querySelector('.strata-grid') as HTMLElement;
    expect(grid.style.getPropertyValue('--strata-row-height')).toBe('48px');
    expect(grid.style.getPropertyValue('--strata-border')).toBe('#abcdef');
    expect(grid.style.getPropertyValue('--strata-border-cell')).toBe('');
    expect(grid.style.getPropertyValue('--strata-border-width')).toBe('');
  });

  it('maps every appearance field to its CSS custom property', () => {
    const { container } = render(
      <DataGrid
        data={data}
        columns={columns}
        appearance={{
          rowHeight: 40,
          borderWidth: 2,
          borderColor: '#111111',
          horizontalBorderColor: '#222222',
          verticalBorderColor: '#333333',
        }}
      />,
    );
    const grid = container.querySelector('.strata-grid') as HTMLElement;
    expect(grid.style.getPropertyValue('--strata-row-height')).toBe('40px');
    expect(grid.style.getPropertyValue('--strata-border-width')).toBe('2px');
    expect(grid.style.getPropertyValue('--strata-border')).toBe('#111111');
    expect(grid.style.getPropertyValue('--strata-border-cell')).toBe('#222222');
    expect(grid.style.getPropertyValue('--strata-border-cell-vertical')).toBe(
      '#333333',
    );
  });
});
