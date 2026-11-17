import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import { TREE_INDENT_WIDTH } from '../model/constants';
import type { ColumnDef } from '../model/types';

interface Node {
  id: string;
  name: string;
  children?: Node[];
}

// One expandable row (P) and one leaf sibling (L) at level 1, as in a BOM.
const data: Node[] = [
  { id: 'P', name: 'Parent row', children: [{ id: 'C', name: 'Child row' }] },
  { id: 'L', name: 'Leaf row' },
];

const columns: ColumnDef<Node>[] = [
  { id: 'name', header: 'Name', accessor: 'name', isTreeColumn: true },
];

const treeData = {
  getRowId: (r: Node) => r.id,
  getChildren: (r: Node) => r.children,
};

const stylesheet = readFileSync(resolve(process.cwd(), 'src/strata.css'), 'utf8');

function label(text: string): HTMLElement {
  return screen.getByText(text) as HTMLElement;
}

// jsdom does not resolve var(); it returns the raw declaration. An unset
// --strata-branch-font-weight falls back to `inherit` per the CSS spec, so
// treat that exact declaration as "no override" (same as a leaf row).
const NO_OVERRIDE = 'var(--strata-branch-font-weight, inherit)';

function effective(el: HTMLElement, prop: 'fontWeight' | 'fontStyle' | 'color'): string {
  const value = getComputedStyle(el)[prop];
  return value === NO_OVERRIDE ? '' : value;
}

function row(text: string): HTMLElement {
  return label(text).closest('.strata-row-container') as HTMLElement;
}

function indentWidth(text: string): number {
  const indent = label(text)
    .closest('.strata-tree-cell')
    ?.querySelector('.strata-tree-indent') as HTMLElement;
  return Number.parseInt(indent.style.width || '0', 10);
}

describe('DataGrid — hierarchy does not depend on font weight', () => {
  let style: HTMLStyleElement;

  beforeEach(() => {
    // Load the real stylesheet so computed styles reflect the shipped rules.
    style = document.createElement('style');
    style.textContent = stylesheet;
    document.head.appendChild(style);
  });

  afterEach(() => {
    style.remove();
  });

  it('gives an expandable row and a leaf sibling the same font-weight by default', () => {
    render(<DataGrid data={data} columns={columns} treeData={treeData} />);
    expect(effective(label('Parent row'), 'fontWeight')).toBe(
      effective(label('Leaf row'), 'fontWeight'),
    );
    expect(effective(label('Parent row'), 'fontStyle')).toBe(
      effective(label('Leaf row'), 'fontStyle'),
    );
    expect(effective(label('Parent row'), 'color')).toBe(
      effective(label('Leaf row'), 'color'),
    );
  });

  it('only changes branch weight when the opt-in variable is set', () => {
    // The opt-in rule must fall back to `inherit` so it is a no-op by default.
    expect(stylesheet).toMatch(
      /:where\(\.strata-row-container\[aria-expanded\] \.strata-tree-label\)\s*\{\s*font-weight:\s*var\(--strata-branch-font-weight,\s*inherit\);/,
    );
  });

  it('puts aria-expanded only on the expandable row', () => {
    render(<DataGrid data={data} columns={columns} treeData={treeData} />);
    expect(row('Parent row')).toHaveAttribute('aria-expanded', 'false');
    expect(row('Leaf row')).not.toHaveAttribute('aria-expanded');
  });

  it('keeps the toggle gutter on leaves so sibling labels align', () => {
    render(<DataGrid data={data} columns={columns} treeData={treeData} />);
    const leafCell = label('Leaf row').closest('.strata-tree-cell') as HTMLElement;
    expect(leafCell.querySelector('.strata-tree-toggle-empty')).not.toBeNull();
    expect(indentWidth('Parent row')).toBe(indentWidth('Leaf row'));
  });

  it('indents children one level further than their parent', () => {
    render(
      <DataGrid data={data} columns={columns} treeData={treeData} defaultExpanded />,
    );
    expect(indentWidth('Child row')).toBe(indentWidth('Parent row') + TREE_INDENT_WIDTH);
  });

  it('keeps the .strata-tree-label hook on every row', () => {
    render(
      <DataGrid data={data} columns={columns} treeData={treeData} defaultExpanded />,
    );
    for (const text of ['Parent row', 'Leaf row', 'Child row']) {
      expect(label(text)).toHaveClass('strata-tree-label');
    }
  });
});
