import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { DataGrid } from './DataGrid';
import type { ColumnDef, TreeDataConfig } from '../model/types';

interface BomNode {
  id: string;
  material: string;
  qty: number;
  children?: BomNode[];
}

const columns: ColumnDef<BomNode>[] = [
  {
    id: 'material',
    header: 'Material',
    accessor: 'material',
    isTreeColumn: true,
  },
  {
    id: 'qty',
    header: 'Qty',
    accessor: 'qty',
    editable: true,
    editorType: 'number',
  },
  { id: 'extQty', header: 'Ext Qty', width: 120 },
];

const treeData: TreeDataConfig<BomNode> = {
  getRowId: (row) => row.id,
  getChildren: (row) => row.children,
};

function updateQty(rows: BomNode[], rowId: string, qty: number): BomNode[] {
  return rows.map((row) =>
    row.id === rowId
      ? { ...row, qty }
      : { ...row, children: row.children ? updateQty(row.children, rowId, qty) : undefined },
  );
}

function EditableBom() {
  const [rows, setRows] = useState<BomNode[]>([
    {
      id: 'root',
      material: 'Assembly',
      qty: 2,
      children: [{ id: 'child', material: 'Bolt', qty: 3 }],
    },
  ]);

  const handleCellEditEnd = (event: {
    rowId: string;
    columnId: string;
    newValue: unknown;
    committed: boolean;
  }) => {
    if (!event.committed || event.columnId !== 'qty') return;
    setRows((current) => updateQty(current, event.rowId, Number(event.newValue)));
  };

  return (
    <DataGrid
      data={rows}
      columns={columns}
      treeData={treeData}
      defaultExpanded
      editable={{ mode: 'cell' }}
      onCellEditEnd={handleCellEditEnd}
      aggregation={{
        extendedQuantity: {
          sourceColumn: 'qty',
          targetColumn: 'extQty',
          compute: 'multiply-down',
        },
      }}
    />
  );
}

describe('DataGrid — BOM roll-up', () => {
  it('displays extended quantities in the target column', () => {
    render(
      <DataGrid
        data={[
          {
            id: 'root',
            material: 'Assembly',
            qty: 2,
            children: [
              {
                id: 'child',
                material: 'Wheel',
                qty: 3,
                children: [{ id: 'grandchild', material: 'Spoke', qty: 4 }],
              },
            ],
          },
        ]}
        columns={columns}
        treeData={treeData}
        defaultExpanded
        aggregation={{
          extendedQuantity: {
            sourceColumn: 'qty',
            targetColumn: 'extQty',
            compute: 'multiply-down',
          },
        }}
      />,
    );

    expect(screen.getByText('Assembly').closest('[role="row"]')).toHaveTextContent(
      '2',
    );
    expect(screen.getByText('Wheel').closest('[role="row"]')).toHaveTextContent(
      '6',
    );
    expect(screen.getByText('Spoke').closest('[role="row"]')).toHaveTextContent(
      '24',
    );
  });

  it('recomputes after a quantity edit is committed', () => {
    const { container } = render(<EditableBom />);

    expect(screen.getByText('Bolt').closest('[role="row"]')).toHaveTextContent(
      '6',
    );

    const rootQtyCell = container.querySelectorAll('.strata-cell')[1];
    fireEvent.doubleClick(rootQtyCell);
    const input = screen.getByDisplayValue('2');
    fireEvent.change(input, { target: { value: '4' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('Bolt').closest('[role="row"]')).toHaveTextContent(
      '12',
    );
  });
});
