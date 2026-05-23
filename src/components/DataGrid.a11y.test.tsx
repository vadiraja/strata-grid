import { fireEvent, render, screen } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef, TreeDataConfig } from '../model/types';

interface FlatRow {
  id: string;
  name: string;
  value: number;
}

const flatData: FlatRow[] = [
  { id: '1', name: 'Alpha', value: 10 },
  { id: '2', name: 'Beta', value: 20 },
  { id: '3', name: 'Gamma', value: 30 },
];

const flatColumns: ColumnDef<FlatRow>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'value', header: 'Value', accessor: 'value' },
];

interface TreeRow {
  id: string;
  name: string;
  children?: TreeRow[];
}

const treeRows: TreeRow[] = [
  {
    id: 'P1',
    name: 'Parent 1',
    children: [
      { id: 'C1', name: 'Child 1' },
      { id: 'C2', name: 'Child 2' },
    ],
  },
  { id: 'P2', name: 'Parent 2' },
];

const treeColumns: ColumnDef<TreeRow>[] = [
  { id: 'name', header: 'Name', accessor: 'name', isTreeColumn: true },
];

const treeData: TreeDataConfig<TreeRow> = {
  getRowId: (row) => row.id,
  getChildren: (row) => row.children,
};

describe('DataGrid — accessibility roles and theme', () => {
  it('uses grid role for flat data and treegrid role for tree data', () => {
    const flat = render(<DataGrid data={flatData} columns={flatColumns} />);
    expect(flat.container.querySelector('.strata-grid')).toHaveAttribute('role', 'grid');
    flat.unmount();

    const tree = render(
      <DataGrid data={treeRows} columns={treeColumns} treeData={treeData} />,
    );
    expect(tree.container.querySelector('.strata-grid')).toHaveAttribute(
      'role',
      'treegrid',
    );
  });

  it('sets the theme attribute on the root grid', () => {
    const { container } = render(
      <DataGrid data={flatData} columns={flatColumns} theme="dark" />,
    );
    expect(container.querySelector('.strata-grid')).toHaveAttribute(
      'data-theme',
      'dark',
    );
  });

  it('makes the grid root keyboard focusable', () => {
    const { container } = render(<DataGrid data={flatData} columns={flatColumns} />);
    expect(container.querySelector('.strata-grid')).toHaveAttribute('tabindex', '0');
  });

  it('preserves tree row aria attributes', () => {
    render(
      <DataGrid
        data={treeRows}
        columns={treeColumns}
        treeData={treeData}
        defaultExpanded
      />,
    );

    const parentRow = screen.getByText('Parent 1').closest('[role="row"]');
    const childRow = screen.getByText('Child 1').closest('[role="row"]');
    expect(parentRow).toHaveAttribute('aria-level', '1');
    expect(parentRow).toHaveAttribute('aria-expanded', 'true');
    expect(childRow).toHaveAttribute('aria-level', '2');
    expect(childRow).not.toHaveAttribute('aria-expanded');
  });
});

describe('DataGrid — keyboard navigation', () => {
  it('renders one active cell and moves it with arrow keys', () => {
    const { container } = render(<DataGrid data={flatData} columns={flatColumns} />);
    const grid = container.querySelector('.strata-grid')!;

    expect(container.querySelectorAll('.strata-cell-focused')).toHaveLength(1);
    expect(container.querySelector('.strata-cell-focused')).toHaveTextContent('Alpha');

    fireEvent.keyDown(grid, { key: 'ArrowRight' });
    expect(container.querySelectorAll('.strata-cell-focused')).toHaveLength(1);
    expect(container.querySelector('.strata-cell-focused')).toHaveTextContent('10');

    fireEvent.keyDown(grid, { key: 'ArrowDown' });
    expect(container.querySelectorAll('.strata-cell-focused')).toHaveLength(1);
    expect(container.querySelector('.strata-cell-focused')).toHaveTextContent('20');
  });

  it('uses aria-activedescendant for the active cell', () => {
    const { container } = render(<DataGrid data={flatData} columns={flatColumns} />);
    const grid = container.querySelector('.strata-grid')!;

    expect(grid).toHaveAttribute('aria-activedescendant', 'strata-cell-0-0');
    expect(container.querySelector('#strata-cell-0-0')).toHaveTextContent('Alpha');
  });

  it('selects an individual cell by clicking it', () => {
    const { container } = render(<DataGrid data={flatData} columns={flatColumns} />);
    const grid = container.querySelector('.strata-grid')!;

    fireEvent.click(screen.getByText('20'));

    expect(container.querySelectorAll('.strata-cell-focused')).toHaveLength(1);
    expect(container.querySelector('.strata-cell-focused')).toHaveTextContent('20');
    expect(grid).toHaveAttribute('aria-activedescendant', 'strata-cell-1-1');
  });

  it('toggles tree expansion with Enter on the tree column', () => {
    const { container } = render(
      <DataGrid
        data={treeRows}
        columns={treeColumns}
        treeData={treeData}
        defaultExpanded
      />,
    );
    const grid = container.querySelector('.strata-grid')!;

    expect(screen.getByText('Child 1')).toBeInTheDocument();
    fireEvent.keyDown(grid, { key: 'Enter' });
    expect(screen.queryByText('Child 1')).not.toBeInTheDocument();
  });

  it('toggles row selection with Space on the selection column', () => {
    render(
      <DataGrid
        data={treeRows}
        columns={treeColumns}
        treeData={treeData}
        defaultExpanded
        selection={{ mode: 'multi' }}
      />,
    );
    const grid = screen.getByRole('treegrid');
    const parentCheckbox = screen.getByRole('checkbox', { name: 'Select row P1' });

    expect(parentCheckbox).not.toBeChecked();
    fireEvent.keyDown(grid, { key: ' ' });
    expect(parentCheckbox).toBeChecked();
  });
});
