import { fireEvent, render, screen } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Row {
  id: string;
  name: string;
  children?: Row[];
}

const data: Row[] = [
  { id: 'A', name: 'Assembly A', children: [
    { id: 'A1', name: 'Part A1' },
    { id: 'A2', name: 'Part A2' },
  ] },
  { id: 'B', name: 'Assembly B' },
];

const columns: ColumnDef<Row>[] = [
  { id: 'name', header: 'Name', accessor: 'name', isTreeColumn: true },
];

const treeData = {
  getRowId: (row: Row) => row.id,
  getChildren: (row: Row) => row.children,
};

function rowCheckbox(rowId: string): HTMLInputElement {
  return screen.getByRole('checkbox', { name: `Select row ${rowId}` });
}

describe('DataGrid — row selection rendering', () => {
  it('renders selection checkboxes when selection is configured', () => {
    render(
      <DataGrid
        data={data}
        columns={columns}
        treeData={treeData}
        defaultExpanded
        selection={{ mode: 'multi' }}
      />,
    );

    expect(screen.getByRole('checkbox', { name: 'Select all rows' })).toBeInTheDocument();
    expect(rowCheckbox('A')).toBeInTheDocument();
    expect(rowCheckbox('A1')).toBeInTheDocument();
  });

  it('does not render selection checkboxes by default', () => {
    render(<DataGrid data={data} columns={columns} treeData={treeData} />);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});

describe('DataGrid — row selection modes', () => {
  it('replaces previous selection in single mode', () => {
    render(
      <DataGrid
        data={data}
        columns={columns}
        treeData={treeData}
        defaultExpanded
        selection={{ mode: 'single' }}
      />,
    );

    fireEvent.click(rowCheckbox('A'));
    fireEvent.click(rowCheckbox('B'));

    expect(rowCheckbox('A')).not.toBeChecked();
    expect(rowCheckbox('B')).toBeChecked();
  });

  it('keeps multiple rows selected in multi mode', () => {
    render(
      <DataGrid
        data={data}
        columns={columns}
        treeData={treeData}
        defaultExpanded
        selection={{ mode: 'multi' }}
      />,
    );

    fireEvent.click(rowCheckbox('A'));
    fireEvent.click(rowCheckbox('B'));

    expect(rowCheckbox('A')).toBeChecked();
    expect(rowCheckbox('B')).toBeChecked();
  });

  it('selects and clears all rows from the header checkbox', () => {
    render(
      <DataGrid
        data={data}
        columns={columns}
        treeData={treeData}
        defaultExpanded
        selection={{ mode: 'multi' }}
      />,
    );

    const selectAll = screen.getByRole('checkbox', { name: 'Select all rows' });
    fireEvent.click(selectAll);

    expect(selectAll).toBeChecked();
    expect(rowCheckbox('A')).toBeChecked();
    expect(rowCheckbox('A1')).toBeChecked();
    expect(rowCheckbox('A2')).toBeChecked();
    expect(rowCheckbox('B')).toBeChecked();

    fireEvent.click(selectAll);
    expect(rowCheckbox('A')).not.toBeChecked();
    expect(rowCheckbox('A1')).not.toBeChecked();
  });
});

describe('DataGrid — cascade row selection', () => {
  it('selects descendants when selecting a parent', () => {
    render(
      <DataGrid
        data={data}
        columns={columns}
        treeData={treeData}
        defaultExpanded
        selection={{ mode: 'multi', cascade: true }}
      />,
    );

    fireEvent.click(rowCheckbox('A'));

    expect(rowCheckbox('A')).toBeChecked();
    expect(rowCheckbox('A1')).toBeChecked();
    expect(rowCheckbox('A2')).toBeChecked();
  });

  it('shows parent as indeterminate when one child is selected', () => {
    render(
      <DataGrid
        data={data}
        columns={columns}
        treeData={treeData}
        defaultExpanded
        selection={{ mode: 'multi', cascade: true }}
      />,
    );

    fireEvent.click(rowCheckbox('A1'));

    expect(rowCheckbox('A')).toHaveAttribute('aria-checked', 'mixed');
    expect(rowCheckbox('A')).not.toBeChecked();
    expect(rowCheckbox('A1')).toBeChecked();
  });
});

describe('DataGrid — selection callback and aria', () => {
  it('fires onSelectionChange with selected row ids', () => {
    const changes: Set<string>[] = [];
    render(
      <DataGrid
        data={data}
        columns={columns}
        treeData={treeData}
        defaultExpanded
        selection={{ mode: 'multi' }}
        onSelectionChange={(state) => changes.push(state.selectedIds)}
      />,
    );

    fireEvent.click(rowCheckbox('B'));

    expect(changes).toEqual([new Set(['B'])]);
  });

  it('marks selected rows with aria-selected', () => {
    render(
      <DataGrid
        data={data}
        columns={columns}
        treeData={treeData}
        defaultExpanded
        selection={{ mode: 'multi' }}
      />,
    );

    fireEvent.click(rowCheckbox('B'));
    expect(screen.getByText('Assembly B').closest('[role="row"]')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
