import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SortIndicator } from '../components/SortIndicator';
import { PaginationBar } from '../components/PaginationBar';
import { QuickSearchInput } from '../components/QuickSearchInput';
import { ExportMenu } from '../components/ExportMenu';
import { ColumnManagementPanel } from '../components/ColumnManagementPanel';
import { WhereUsedDialog } from '../components/WhereUsedDialog';
import { LoadingRow } from '../components/LoadingRow';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { TreeCell } from '../components/TreeCell';
import { FilterPopover } from '../components/FilterPopover';
import { RowEditControls } from '../components/editors/RowEditControls';
import { EditContext } from '../model/edit-context';

/**
 * Icon Coverage Tests
 *
 * Verifies that SVG elements are present in all components that were updated
 * during the icon rollout (Task 2). Each component is rendered with minimal
 * required props and asserts that at least one <svg> element is in the output.
 */
describe('Icon Coverage — SVG presence in changed components', () => {
  it('SortIndicator renders SVG when direction is "asc"', () => {
    const { container } = render(<SortIndicator direction="asc" />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('SortIndicator renders SVG when direction is "desc"', () => {
    const { container } = render(<SortIndicator direction="desc" />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('PaginationBar renders SVG icons in navigation buttons', () => {
    const { container } = render(
      <PaginationBar
        currentPage={1}
        totalPages={5}
        pageSize={10}
        totalCount={50}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />,
    );
    const svgs = container.querySelectorAll('svg');
    // Should have at least 4 SVGs (first, prev, next, last page buttons)
    expect(svgs.length).toBeGreaterThanOrEqual(4);
  });

  it('QuickSearchInput renders SVG search icon', () => {
    const { container } = render(
      <QuickSearchInput value="" onChange={() => {}} onClear={() => {}} />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('ExportMenu renders SVG download icon', () => {
    const { container } = render(
      <ExportMenu formats={['csv']} onExport={() => {}} />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('ColumnManagementPanel renders SVG icons for column visibility toggles', () => {
    const { container } = render(
      <ColumnManagementPanel
        columns={[{ id: 'col1', header: 'Column 1' }]}
        hiddenColumns={[]}
        onToggleColumn={() => {}}
        onMoveColumn={() => {}}
        onReset={() => {}}
        onClose={() => {}}
      />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('ColumnManagementPanel renders SVG eye-off icon for hidden columns', () => {
    const { container } = render(
      <ColumnManagementPanel
        columns={[{ id: 'col1', header: 'Column 1' }]}
        hiddenColumns={['col1']}
        onToggleColumn={() => {}}
        onMoveColumn={() => {}}
        onReset={() => {}}
        onClose={() => {}}
      />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('WhereUsedDialog renders SVG close icon', () => {
    const { container } = render(
      <WhereUsedDialog
        nodeLabel="Part A"
        results={[]}
        isLoading={false}
        renderNodeLabel={(node: string) => node}
        onClose={() => {}}
      />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('LoadingRow renders SVG spinner icon', () => {
    const { container } = render(<LoadingRow depth={0} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('LoadingOverlay renders SVG spinner icon when visible', () => {
    const { container } = render(<LoadingOverlay visible={true} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('LoadingOverlay renders nothing when not visible', () => {
    const { container } = render(<LoadingOverlay visible={false} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('TreeCell renders SVG chevron icon for expandable rows', () => {
    const mockCell = {
      row: {
        depth: 0,
        getCanExpand: () => true,
        getIsExpanded: () => false,
        toggleExpanded: () => {},
        id: 'row-1',
      },
      column: {
        getSize: () => 200,
        id: 'name',
        columnDef: {
          meta: {
            strataColumn: {
              cell: undefined,
            },
          },
        },
      },
      getValue: () => 'Test Node',
      getContext: () => ({}),
    };

    const { container } = render(
      <TreeCell cell={mockCell as any} />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('FilterPopover renders SVG filter icon', () => {
    const mockColumn = {
      id: 'name',
      getFilterValue: () => undefined,
      setFilterValue: () => {},
    };

    const { container } = render(
      <FilterPopover
        column={mockColumn as any}
        resolved={{ type: 'text', operators: ['contains'] }}
      />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('RowEditControls renders SVG check and x icons when editing', () => {
    const mockEditCtx = {
      config: { mode: 'row' as const },
      editState: {
        activeRow: { rowId: 'row-1' },
        commitRowEdit: () => {},
        discardRowEdit: () => {},
        getRowValidationSummary: () => ({ hasInvalid: false, hasValidating: false }),
      },
    };

    const mockRow = {
      id: 'row-1',
      getVisibleCells: () => [],
    };

    const { container } = render(
      <EditContext.Provider value={mockEditCtx as any}>
        <RowEditControls row={mockRow as any} />
      </EditContext.Provider>,
    );
    const svgs = container.querySelectorAll('svg');
    // Should have 2 SVGs: check (save) and x (cancel)
    expect(svgs.length).toBe(2);
  });
});
