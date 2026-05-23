import { render, waitFor, fireEvent, screen } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';
import type { DataSource } from '../data/data-source';
import type {
  DataSourceCapabilities,
  PageParams,
  PageResult,
} from '../data/types';

interface Row {
  id: string;
  name: string;
}

const ALL: Row[] = Array.from({ length: 47 }, (_, i) => ({
  id: String(i),
  name: `Row ${i}`,
}));

function makeMockSource(): DataSource<Row> {
  return {
    async load() {
      return ALL;
    },
    async loadPage({ offset, limit }: PageParams): Promise<PageResult<Row>> {
      const start = typeof offset === 'number' ? offset : 0;
      const slice = ALL.slice(start, start + limit);
      return {
        rows: slice,
        totalCount: ALL.length,
        hasMore: start + limit < ALL.length,
      };
    },
    capabilities(): DataSourceCapabilities {
      return { pagination: true };
    },
  };
}

const columns: ColumnDef<Row>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
];

describe('DataGrid — onPaginationChange', () => {
  it('fires on initial load with totalCount and page 0', async () => {
    const onPaginationChange = vi.fn();
    render(
      <DataGrid
        data={[]}
        columns={columns}
        dataSource={makeMockSource()}
        pagination={{ pageSize: 10 }}
        onPaginationChange={onPaginationChange}
      />,
    );

    await waitFor(() => {
      const calls = onPaginationChange.mock.calls;
      const last = calls[calls.length - 1]?.[0];
      expect(last?.totalCount).toBe(47);
      expect(last?.currentPage).toBe(0);
      expect(last?.pageSize).toBe(10);
      expect(last?.isLoading).toBe(false);
      expect(last?.error).toBe(null);
    });
  });

  it('fires with isLoading=true while a page is loading', async () => {
    const onPaginationChange = vi.fn();
    render(
      <DataGrid
        data={[]}
        columns={columns}
        dataSource={makeMockSource()}
        pagination={{ pageSize: 10 }}
        onPaginationChange={onPaginationChange}
      />,
    );

    // Should see at least one isLoading=true call before settling.
    const loadingCall = onPaginationChange.mock.calls.find(
      (c) => c[0]?.isLoading === true,
    );
    expect(loadingCall).toBeDefined();

    await waitFor(() => {
      const last = onPaginationChange.mock.calls.slice(-1)[0]?.[0];
      expect(last?.isLoading).toBe(false);
    });
  });

  it('fires with updated currentPage after navigating to next page', async () => {
    const onPaginationChange = vi.fn();
    render(
      <DataGrid
        data={[]}
        columns={columns}
        dataSource={makeMockSource()}
        pagination={{ pageSize: 10 }}
        onPaginationChange={onPaginationChange}
      />,
    );

    // Wait for the initial load to settle.
    await waitFor(() => {
      const last = onPaginationChange.mock.calls.slice(-1)[0]?.[0];
      expect(last?.totalCount).toBe(47);
    });

    // Click the "Next" pagination button.
    const nextBtn = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      const last = onPaginationChange.mock.calls.slice(-1)[0]?.[0];
      expect(last?.currentPage).toBe(1);
    });
  });

  it('does not throw or call back when prop is omitted', async () => {
    render(
      <DataGrid
        data={[]}
        columns={columns}
        dataSource={makeMockSource()}
        pagination={{ pageSize: 10 }}
      />,
    );

    // If we got here without errors, the test passes — no callback wired.
    await waitFor(() => {
      expect(screen.getByText('Row 0')).toBeInTheDocument();
    });
  });
});
