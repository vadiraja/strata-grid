import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface ListRow {
  id: string;
  label: string;
}

function makeRows(count: number): ListRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i),
    label: `Row ${i}`,
  }));
}

const columns: ColumnDef<ListRow>[] = [
  { id: 'label', header: 'Label', accessor: 'label' },
];

describe('DataGrid — row virtualization', () => {
  it('renders only a window of rows for a large dataset', () => {
    render(<DataGrid data={makeRows(1000)} columns={columns} />);
    // Without virtualization this would be 1001 (1000 body rows + 1 header).
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(100);
  });

  it('renders the first rows but not rows far outside the viewport', () => {
    render(<DataGrid data={makeRows(1000)} columns={columns} />);
    expect(screen.getByText('Row 0')).toBeInTheDocument();
    expect(screen.queryByText('Row 999')).not.toBeInTheDocument();
  });

  it('sizes the scroll area to the full row count', () => {
    const { container } = render(
      <DataGrid data={makeRows(1000)} columns={columns} />,
    );
    const sizer = container.querySelector('.strata-body-sizer');
    expect(sizer).not.toBeNull();
    // 1000 rows * 32px row height
    expect((sizer as HTMLElement).style.height).toBe('32000px');
  });

  it('renders rows near the new position after scrolling', () => {
    const { container } = render(
      <DataGrid data={makeRows(1000)} columns={columns} />,
    );
    const scroller = container.querySelector('.strata-body') as HTMLElement;
    scroller.scrollTop = 16000; // ~row 500 at 32px per row
    fireEvent.scroll(scroller);
    expect(screen.getByText('Row 500')).toBeInTheDocument();
  });

  it('still renders every row for a small dataset', () => {
    render(<DataGrid data={makeRows(5)} columns={columns} />);
    for (let i = 0; i < 5; i += 1) {
      expect(screen.getByText(`Row ${i}`)).toBeInTheDocument();
    }
  });
});
