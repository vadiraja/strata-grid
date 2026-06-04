import { useEffect } from 'react';
import type { Cell } from '@tanstack/react-table';
import type { EditorType } from '../../model/types';
import { useEditContext } from '../../model/edit-context';
import { useValidation } from '../../model/use-validation';
import { resolveEditableNavigationTarget } from '../../model/use-edit-navigation';
import { TextEditor } from './TextEditor';
import { NumberEditor } from './NumberEditor';
import { SelectEditor, type SelectChoice } from './SelectEditor';
import { DateEditor } from './DateEditor';
import { CheckboxEditor } from './CheckboxEditor';
import { ValidationMessage } from './ValidationMessage';
import { renderActiveEditor } from './renderActiveEditor';

export interface CellEditorProps<TRow> {
  cell: Cell<TRow, unknown>;
}

function normalizeChoices(options?: Record<string, unknown>): SelectChoice[] {
  const rawChoices = options?.choices ?? options?.options;
  if (!Array.isArray(rawChoices)) return [];

  return rawChoices
    .map((choice): SelectChoice | null => {
      if (
        choice &&
        typeof choice === 'object' &&
        'value' in choice &&
        'label' in choice
      ) {
        const value = (choice as { value: unknown }).value;
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          return {
            value,
            label: String((choice as { label: unknown }).label),
          };
        }
        return null;
      }

      if (
        typeof choice === 'string' ||
        typeof choice === 'number' ||
        typeof choice === 'boolean'
      ) {
        return { value: choice, label: String(choice) };
      }

      return null;
    })
    .filter((choice): choice is SelectChoice => choice !== null);
}

export function inferEditorType(value: unknown): EditorType {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'checkbox';
  return 'text';
}

export function CellEditor<TRow>({ cell }: CellEditorProps<TRow>) {
  const editCtx = useEditContext();
  if (!editCtx) return null;

  const { activeCell, activeRow } = editCtx.editState;
  const isActiveCell =
    activeCell?.rowId === cell.row.id && activeCell.columnId === cell.column.id;
  const isActiveRow = activeRow?.rowId === cell.row.id;
  if (!isActiveCell && !isActiveRow) return null;

  const column = cell.column.columnDef.meta?.strataColumn;
  if (!column) return null;

  const value = isActiveRow
    ? activeRow.pendingValues.get(cell.column.id)
    : activeCell?.pendingValue;
  const onChange = (nextValue: unknown) => {
    if (isActiveRow) {
      editCtx.editState.setRowPendingValue(cell.column.id, nextValue);
      return;
    }

    editCtx.editState.setPendingValue(nextValue);
  };
  const onDiscard = isActiveRow
    ? editCtx.editState.discardRowEdit
    : editCtx.editState.discardEdit;
  const { validation, validateNow } = useValidation({
    validate: column.validate,
    value,
    row: cell.row.original,
  });
  useEffect(() => {
    if (isActiveRow) {
      editCtx.editState.setRowValidationState(cell.column.id, validation.status);
    }
  }, [cell.column.id, editCtx.editState, isActiveRow, validation.status]);

  const onCommit = async () => {
    if (!column.validate) {
      if (isActiveRow) return;
      editCtx.editState.commitEdit();
      return;
    }

    const nextValidation = await validateNow();
    if (nextValidation.status !== 'valid') return;
    if (isActiveRow) return;
    editCtx.editState.commitEdit();
  };
  const onNavigateKey = (event: React.KeyboardEvent) => {
    if (isActiveRow || !activeCell) return false;
    if (event.key !== 'Tab' && event.key !== 'Enter') return false;

    const table = cell.getContext().table;
    const target = resolveEditableNavigationTarget(
      {
        columnIds: table.getVisibleLeafColumns().map((column) => column.id),
        rows: table.getRowModel().rows.map((row) => ({
          id: row.id,
          original: row.original,
          getIsGrouped: row.getIsGrouped,
          cells: row.getVisibleCells().map((visibleCell) => ({
            columnId: visibleCell.column.id,
            value: visibleCell.getValue(),
            column: visibleCell.column.columnDef.meta!.strataColumn,
          })),
        })),
      },
      activeCell,
      event.key === 'Enter' ? 'down' : event.shiftKey ? 'previous' : 'next',
    );

    event.preventDefault();
    void (async () => {
      if (column.validate) {
        const nextValidation = await validateNow();
        if (nextValidation.status !== 'valid') return;
      }

      editCtx.editState.commitEdit();
      if (target) {
        editCtx.editState.startEdit(target.rowId, target.columnId, target.value);
      }
    })();
    return true;
  };

  const editorContext = {
    value,
    row: cell.row.original,
    column,
    rowId: cell.row.id,
    onChange,
    onCommit,
    onDiscard,
    validation,
  };

  return (
    <div
      className="strata-cell-editor-container"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {renderActiveEditor(editorContext, column, {
        autoFocus: !isActiveRow,
        onNavigateKey,
      })}
      <ValidationMessage validation={validation} />
    </div>
  );
}

export function renderBuiltInEditor(
  editorType: EditorType,
  value: unknown,
  onChange: (value: unknown) => void,
  onCommit: () => void,
  onDiscard: () => void,
  editorOptions?: Record<string, unknown>,
  autoFocus?: boolean,
  onNavigateKey?: (event: React.KeyboardEvent) => boolean,
) {
  switch (editorType) {
    case 'number':
      return (
        <NumberEditor
          value={value}
          onChange={onChange}
          onCommit={onCommit}
          onDiscard={onDiscard}
          autoFocus={autoFocus}
          onNavigateKey={onNavigateKey}
        />
      );
    case 'select':
      return (
        <SelectEditor
          value={value}
          choices={normalizeChoices(editorOptions)}
          onChange={onChange}
          onCommit={onCommit}
          onDiscard={onDiscard}
          autoFocus={autoFocus}
          onNavigateKey={onNavigateKey}
        />
      );
    case 'date':
      return (
        <DateEditor
          value={value}
          onChange={onChange}
          onCommit={onCommit}
          onDiscard={onDiscard}
          autoFocus={autoFocus}
          onNavigateKey={onNavigateKey}
        />
      );
    case 'checkbox':
      return (
        <CheckboxEditor
          value={value}
          onChange={onChange}
          onCommit={onCommit}
          onDiscard={onDiscard}
          autoFocus={autoFocus}
          onNavigateKey={onNavigateKey}
        />
      );
    case 'text':
    default:
      return (
        <TextEditor
          value={value}
          onChange={onChange}
          onCommit={onCommit}
          onDiscard={onDiscard}
          autoFocus={autoFocus}
          onNavigateKey={onNavigateKey}
        />
      );
  }
}
