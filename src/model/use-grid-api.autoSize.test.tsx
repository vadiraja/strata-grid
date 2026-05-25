import { describe, expect, it, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { useRef, useEffect } from 'react';
import { DataGrid } from '../components/DataGrid';
import type { ColumnDef } from './types';
import type { GridApi } from './use-grid-api';

interface Row { id: string; name: string }
const rows: Row[] = [
  { id: '1', name: 'short' },
  { id: '2', name: 'longer label drives autosize' },
];
const columns: ColumnDef<Row>[] = [
  { id: 'name', header: 'Name', accessor: 'name', width: 60 },
];

afterEach(cleanup);

describe('GridApi — autoSizeColumn', () => {
  it('updates columnSizing with measured width', () => {
    let api: GridApi<Row> | null = null;
    function Harness() {
      const ref = useRef<GridApi<Row> | null>(null);
      useEffect(() => {
        api = ref.current;
      });
      return <DataGrid data={rows} columns={columns} apiRef={ref} />;
    }
    render(<Harness />);
    document.querySelectorAll('[data-strata-cell-column="name"]').forEach((el, i) => {
      Object.defineProperty(el, 'scrollWidth', { configurable: true, value: i === 1 ? 200 : 30 });
    });
    act(() => {
      api!.autoSizeColumn('name');
    });
    const cell = document.querySelector('[data-strata-cell-column="name"]') as HTMLElement;
    expect(cell.style.width).toBe(`${200 + 16}px`);
  });

  it('autoSizeAllColumns updates every visible column', () => {
    let api: GridApi<Row> | null = null;
    function Harness() {
      const ref = useRef<GridApi<Row> | null>(null);
      useEffect(() => {
        api = ref.current;
      });
      return <DataGrid data={rows} columns={columns} apiRef={ref} />;
    }
    render(<Harness />);
    document.querySelectorAll('[data-strata-cell-column="name"]').forEach((el) => {
      Object.defineProperty(el, 'scrollWidth', { configurable: true, value: 150 });
    });
    act(() => {
      api!.autoSizeAllColumns();
    });
    const cell = document.querySelector('[data-strata-cell-column="name"]') as HTMLElement;
    expect(cell.style.width).toBe(`${150 + 16}px`);
  });
});
