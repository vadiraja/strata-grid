import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { DataGrid } from '../components/DataGrid';
import type { ColumnDef } from '../model/types';

interface TestRow {
  id: string;
  name: string;
}

const testData: TestRow[] = [
  { id: '1', name: 'Alpha' },
  { id: '2', name: 'Beta' },
  { id: '3', name: 'Gamma' },
];

const testColumns: ColumnDef<TestRow>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
];

/**
 * Mocks window.matchMedia to control prefers-color-scheme reporting.
 */
function mockMatchMedia(prefersDark: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql = {
    matches: prefersDark,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.push(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    },
  };
  window.matchMedia = () => mql as unknown as MediaQueryList;
  return { mql, listeners };
}

describe('DataGrid auto theme integration', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('resolves to data-theme="dark" when OS prefers dark', () => {
    mockMatchMedia(true);

    const { container } = render(
      <DataGrid data={testData} columns={testColumns} theme="auto" />,
    );

    const gridRoot = container.querySelector('.strata-grid');
    expect(gridRoot).not.toBeNull();
    expect(gridRoot).toHaveAttribute('data-theme', 'dark');
  });

  it('resolves to data-theme="light" when OS does not prefer dark', () => {
    mockMatchMedia(false);

    const { container } = render(
      <DataGrid data={testData} columns={testColumns} theme="auto" />,
    );

    const gridRoot = container.querySelector('.strata-grid');
    expect(gridRoot).not.toBeNull();
    expect(gridRoot).toHaveAttribute('data-theme', 'light');
  });
});
