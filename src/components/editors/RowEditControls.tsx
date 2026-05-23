import type { Row } from '@tanstack/react-table';
import { useEditContext } from '../../model/edit-context';

export interface RowEditControlsProps<TRow> {
  row: Row<TRow>;
}

export function RowEditControls<TRow>({ row }: RowEditControlsProps<TRow>) {
  const editCtx = useEditContext();
  if (!editCtx || editCtx.config.mode !== 'row') return null;

  const isEditing = editCtx.editState.activeRow?.rowId === row.id;
  const validation = editCtx.editState.getRowValidationSummary();
  const saveDisabled = validation.hasInvalid || validation.hasValidating;

  const startRowEdit = () => {
    const values = new Map<string, unknown>();
    row.getVisibleCells().forEach((cell) => {
      const column = cell.column.columnDef.meta?.strataColumn;
      if (!column?.editable) return;

      const editable =
        typeof column.editable === 'function'
          ? column.editable(row.original)
          : column.editable;
      if (editable) {
        values.set(cell.column.id, cell.getValue());
      }
    });

    if (values.size > 0) {
      editCtx.editState.startRowEdit(row.id, values);
    }
  };

  return (
    <div className="strata-row-edit-controls" role="gridcell">
      {isEditing ? (
        <>
          <button
            className="strata-row-edit-button strata-row-edit-save"
            type="button"
            onClick={() => editCtx.editState.commitRowEdit()}
            disabled={saveDisabled}
          >
            Save
          </button>
          <button
            className="strata-row-edit-button"
            type="button"
            onClick={() => editCtx.editState.discardRowEdit()}
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          className="strata-row-edit-button"
          type="button"
          onClick={startRowEdit}
        >
          Edit
        </button>
      )}
    </div>
  );
}
