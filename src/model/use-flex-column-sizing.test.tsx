import { createRef } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Table } from '@tanstack/react-table';
import { useFlexColumnSizing } from './use-flex-column-sizing';
import type { ColumnDef } from './types';

interface Row {
  a: string;
  b: string;
}

const columns: ColumnDef<Row>[] = [
  { id: 'a', header: 'A', accessor: 'a', width: 200 },
  { id: 'b', header: 'B', accessor: 'b', flex: 1 },
];

/** Real div whose clientWidth we control, so getComputedStyle still works. */
function makeContainer(clientWidth: number) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth });
  const ref = createRef<HTMLElement>();
  (ref as { current: HTMLElement }).current = el;
  return ref;
}

function lastFlexWidths(setColumnSizing: ReturnType<typeof vi.fn>): Record<string, number> {
  const calls = setColumnSizing.mock.calls;
  const updater = calls[calls.length - 1]?.[0] as (prev: object) => object;
  return updater({}) as Record<string, number>;
}

describe('useFlexColumnSizing reserved chrome width', () => {
  it('gives the flex column the full track when there is no selection', () => {
    const setColumnSizing = vi.fn();
    const table = { setColumnSizing } as unknown as Table<Row>;
    renderHook(() =>
      useFlexColumnSizing({
        table,
        columns,
        containerRef: makeContainer(1000),
        columnSizing: {},
      }),
    );
    // 1000 container - 200 fixed = 800 for the flex column.
    expect(lastFlexWidths(setColumnSizing).b).toBe(800);
  });

  it('reserves the selection column width so flex columns do not overshoot', () => {
    const setColumnSizing = vi.fn();
    const table = { setColumnSizing } as unknown as Table<Row>;
    renderHook(() =>
      useFlexColumnSizing({
        table,
        columns,
        containerRef: makeContainer(1000),
        columnSizing: {},
        hasSelectionColumn: true,
      }),
    );
    // 1000 - 40 selection - 200 fixed = 760 for the flex column.
    expect(lastFlexWidths(setColumnSizing).b).toBe(760);
  });

  it('reserves the row-edit actions pane width', () => {
    const setColumnSizing = vi.fn();
    const table = { setColumnSizing } as unknown as Table<Row>;
    renderHook(() =>
      useFlexColumnSizing({
        table,
        columns,
        containerRef: makeContainer(1000),
        columnSizing: {},
        hasRowEditControls: true,
      }),
    );
    // 1000 - 124 row-edit pane - 200 fixed = 676 for the flex column.
    expect(lastFlexWidths(setColumnSizing).b).toBe(676);
  });
});
