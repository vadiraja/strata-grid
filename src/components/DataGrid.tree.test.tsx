import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import { TREE_INDENT_WIDTH } from '../model/constants';
import type { ColumnDef } from '../model/types';

interface BomNode {
  id: string;
  name: string;
  children?: BomNode[];
}

const nestedBom: BomNode[] = [
  {
    id: 'A',
    name: 'Assembly A',
    children: [
      { id: 'A1', name: 'Part A1' },
      { id: 'A2', name: 'Part A2' },
    ],
  },
  {
    id: 'B',
    name: 'Assembly B',
    children: [{ id: 'B1', name: 'Part B1' }],
  },
];

const columns: ColumnDef<BomNode>[] = [
  { id: 'name', header: 'Name', accessor: 'name', isTreeColumn: true },
];

const nestedTree = {
  getRowId: (r: BomNode) => r.id,
  getChildren: (r: BomNode) => r.children,
};

function indentWidth(label: string): number {
  const cell = screen.getByText(label).closest('.strata-tree-cell');
  const indent = cell?.querySelector('.strata-tree-indent') as HTMLElement;
  return Number.parseInt(indent.style.width || '0', 10);
}

describe('DataGrid — tree data', () => {
  it('renders with the treegrid role in tree mode', () => {
    const { container } = render(
      <DataGrid data={nestedBom} columns={columns} treeData={nestedTree} />,
    );
    expect(container.querySelector('[role="treegrid"]')).not.toBeNull();
  });

  it('shows only root rows when collapsed by default', () => {
    render(<DataGrid data={nestedBom} columns={columns} treeData={nestedTree} />);
    expect(screen.getByText('Assembly A')).toBeInTheDocument();
    expect(screen.getByText('Assembly B')).toBeInTheDocument();
    expect(screen.queryByText('Part A1')).not.toBeInTheDocument();
  });

  it('reveals child rows when a parent is expanded', () => {
    render(<DataGrid data={nestedBom} columns={columns} treeData={nestedTree} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Expand row' })[0]);
    expect(screen.getByText('Part A1')).toBeInTheDocument();
    expect(screen.getByText('Part A2')).toBeInTheDocument();
  });

  it('hides child rows again when a parent is collapsed', () => {
    render(<DataGrid data={nestedBom} columns={columns} treeData={nestedTree} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Expand row' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse row' }));
    expect(screen.queryByText('Part A1')).not.toBeInTheDocument();
  });

  it('renders every row when defaultExpanded is set', () => {
    render(
      <DataGrid
        data={nestedBom}
        columns={columns}
        treeData={nestedTree}
        defaultExpanded
      />,
    );
    expect(screen.getByText('Part A1')).toBeInTheDocument();
    expect(screen.getByText('Part B1')).toBeInTheDocument();
  });

  it('sets aria-level on rows by depth', () => {
    render(
      <DataGrid
        data={nestedBom}
        columns={columns}
        treeData={nestedTree}
        defaultExpanded
      />,
    );
    const rootRow = screen.getByText('Assembly A').closest('[role="row"]');
    const childRow = screen.getByText('Part A1').closest('[role="row"]');
    expect(rootRow).toHaveAttribute('aria-level', '1');
    expect(childRow).toHaveAttribute('aria-level', '2');
  });

  it('marks an expandable row with aria-expanded', () => {
    render(<DataGrid data={nestedBom} columns={columns} treeData={nestedTree} />);
    const rootRow = screen.getByText('Assembly A').closest('[role="row"]');
    expect(rootRow).toHaveAttribute('aria-expanded', 'false');
  });

  it('indents child rows deeper than their parent', () => {
    render(
      <DataGrid
        data={nestedBom}
        columns={columns}
        treeData={nestedTree}
        defaultExpanded
      />,
    );
    expect(indentWidth('Assembly A')).toBe(0);
    expect(indentWidth('Part A1')).toBe(TREE_INDENT_WIDTH);
  });

  it('does not render an expand control for leaf rows', () => {
    render(
      <DataGrid
        data={nestedBom}
        columns={columns}
        treeData={nestedTree}
        defaultExpanded
      />,
    );
    // 2 assemblies expand; the 3 leaf parts have no control.
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('builds the tree from flat parent-pointer data', () => {
    interface FlatRow {
      id: string;
      name: string;
      parentId: string | null;
    }
    const flat: FlatRow[] = [
      { id: 'root', name: 'Root', parentId: null },
      { id: 'child', name: 'Child', parentId: 'root' },
    ];
    const flatColumns: ColumnDef<FlatRow>[] = [
      { id: 'name', header: 'Name', accessor: 'name', isTreeColumn: true },
    ];
    render(
      <DataGrid
        data={flat}
        columns={flatColumns}
        treeData={{ getRowId: (r) => r.id, getParentId: (r) => r.parentId }}
        defaultExpanded
      />,
    );
    expect(screen.getByText('Root')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
  });
});
