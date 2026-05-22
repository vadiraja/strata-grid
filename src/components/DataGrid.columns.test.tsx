import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Row {
  id: string;
  a: string;
  b: string;
  c: string;
}

const data: Row[] = [
  { id: '1', a: 'A1', b: 'B1', c: 'C1' },
  { id: '2', a: 'A2', b: 'B2', c: 'C2' },
];

function createDataTransfer() {
  const store = new Map<string, string>();
  return {
    effectAllowed: '',
    dropEffect: '',
    setData: (type: string, value: string) => {
      store.set(type, value);
    },
    getData: (type: string) => store.get(type) ?? '',
  };
}

describe('DataGrid — column pinning', () => {
  it('renders pinned-left columns in a separate pane', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a', pin: 'left' },
      { id: 'b', header: 'Col B', accessor: 'b' },
      { id: 'c', header: 'Col C', accessor: 'c' },
    ];
    const { container } = render(<DataGrid data={data} columns={columns} />);
    // Panes appear in both header and body — combine all text to assert data presence
    const leftPanes = container.querySelectorAll('.strata-pane-left');
    expect(leftPanes.length).toBeGreaterThan(0);
    const combined = Array.from(leftPanes).map((el) => el.textContent).join('');
    expect(combined).toContain('A1');
  });

  it('renders pinned-right columns in a separate pane', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a' },
      { id: 'b', header: 'Col B', accessor: 'b' },
      { id: 'c', header: 'Col C', accessor: 'c', pin: 'right' },
    ];
    const { container } = render(<DataGrid data={data} columns={columns} />);
    const rightPanes = container.querySelectorAll('.strata-pane-right');
    expect(rightPanes.length).toBeGreaterThan(0);
    const combined = Array.from(rightPanes).map((el) => el.textContent).join('');
    expect(combined).toContain('C1');
  });

  it('does not render pinned panes when no columns are pinned', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a' },
      { id: 'b', header: 'Col B', accessor: 'b' },
    ];
    const { container } = render(<DataGrid data={data} columns={columns} />);
    expect(container.querySelector('.strata-pane-left')).toBeNull();
    expect(container.querySelector('.strata-pane-right')).toBeNull();
  });

  it('lets controlled pinning override column pin fields', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a', pin: 'left' },
      { id: 'b', header: 'Col B', accessor: 'b' },
      { id: 'c', header: 'Col C', accessor: 'c' },
    ];
    const { container } = render(
      <DataGrid
        data={data}
        columns={columns}
        columnPinning={{ left: [], right: ['c'] }}
      />,
    );

    const leftPanes = container.querySelectorAll('.strata-pane-left');
    const rightPanes = container.querySelectorAll('.strata-pane-right');
    expect(Array.from(leftPanes).map((el) => el.textContent).join('')).not.toContain('A1');
    expect(Array.from(rightPanes).map((el) => el.textContent).join('')).toContain('C1');
  });
});

describe('DataGrid — horizontal column layout', () => {
  it('sizes the body to pinned panes plus the virtualized center width', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a', width: 120, pin: 'left' },
      { id: 'b', header: 'Col B', accessor: 'b', width: 180 },
      { id: 'c', header: 'Col C', accessor: 'c', width: 220, pin: 'right' },
    ];

    const { container } = render(<DataGrid data={data} columns={columns} />);

    const scrollbarSizer = container.querySelector(
      '.strata-horizontal-scrollbar-sizer',
    ) as HTMLElement;
    const headerCenterStrip = container.querySelector(
      '.strata-header-center-strip',
    ) as HTMLElement;

    expect(scrollbarSizer.style.width).toBe('180px');
    expect(headerCenterStrip.style.width).toBe('180px');
  });

  it('translates the center header from the center scrollbar position', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a', width: 120, pin: 'left' },
      { id: 'b', header: 'Col B', accessor: 'b', width: 180 },
      { id: 'c', header: 'Col C', accessor: 'c', width: 180 },
      { id: 'id', header: 'ID', accessor: 'id', width: 120, pin: 'right' },
    ];

    const { container } = render(<DataGrid data={data} columns={columns} />);
    const scrollbar = container.querySelector(
      '.strata-horizontal-native-scrollbar',
    ) as HTMLElement;

    scrollbar.scrollLeft = 180;
    fireEvent.scroll(scrollbar);

    const headerCenterStrip = container.querySelector(
      '.strata-header-center-strip',
    ) as HTMLElement;
    const bodyCenterStrip = container.querySelector(
      '.strata-body-center .strata-center-strip',
    ) as HTMLElement;

    expect(headerCenterStrip.style.transform).toBe('translateX(-180px)');
    expect(bodyCenterStrip.style.transform).toBe('translateX(-180px)');
  });
});

describe('DataGrid — column resize', () => {
  it('renders a resize handle on each column header', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a' },
      { id: 'b', header: 'Col B', accessor: 'b' },
    ];
    const { container } = render(<DataGrid data={data} columns={columns} />);
    const handles = container.querySelectorAll('.strata-resize-handle');
    expect(handles).toHaveLength(2);
  });

  it('marks the resize handle as active during drag', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a' },
    ];
    const { container } = render(<DataGrid data={data} columns={columns} />);
    const handle = container.querySelector('.strata-resize-handle')!;
    fireEvent.mouseDown(handle);
    expect(handle.classList.contains('strata-resize-handle-active')).toBe(true);
  });

  it('applies controlled column sizing to headers and body cells', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a' },
      { id: 'b', header: 'Col B', accessor: 'b' },
    ];
    const { container } = render(
      <DataGrid data={data} columns={columns} columnSizing={{ a: 240 }} />,
    );

    const header = screen.getByRole('columnheader', { name: /Col A/ });
    const firstBodyCell = container.querySelector(
      '.strata-body .strata-cell',
    ) as HTMLElement;

    expect(header).toHaveStyle({ width: '240px' });
    expect(firstBodyCell).toHaveStyle({ width: '240px' });
  });
});

describe('DataGrid — column reorder', () => {
  it('makes header cells draggable', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a' },
      { id: 'b', header: 'Col B', accessor: 'b' },
    ];
    render(<DataGrid data={data} columns={columns} />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]).toHaveAttribute('draggable', 'true');
    expect(headers[1]).toHaveAttribute('draggable', 'true');
  });

  it('reorders columns after dragging a header onto another header', () => {
    const columns: ColumnDef<Row>[] = [
      { id: 'a', header: 'Col A', accessor: 'a' },
      { id: 'b', header: 'Col B', accessor: 'b' },
      { id: 'c', header: 'Col C', accessor: 'c' },
    ];
    const changes: string[][] = [];
    render(
      <DataGrid
        data={data}
        columns={columns}
        onColumnOrderChange={(state) => changes.push(state)}
      />,
    );

    const dataTransfer = createDataTransfer();
    const colA = screen.getByRole('columnheader', { name: /Col A/ });
    const colC = screen.getByRole('columnheader', { name: /Col C/ });

    fireEvent.dragStart(colA, { dataTransfer });
    fireEvent.dragOver(colC, { dataTransfer });
    fireEvent.drop(colC, { dataTransfer });

    expect(changes[changes.length - 1]).toEqual(['b', 'c', 'a']);
    expect(screen.getAllByRole('columnheader').map((el) => el.textContent)).toEqual([
      'Col B',
      'Col C',
      'Col A',
    ]);
  });
});
