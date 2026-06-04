// NOTE (0.5.0): modal editing resolves the target from editState.activeCell, so it
// applies to cell-mode editing only. In row-edit mode (config.mode === 'row') a
// modal column is not opened in a dialog. Unifying row-mode + modal is a 0.5.x follow-up.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditContext } from '../model/edit-context';
import { renderActiveEditor } from './editors/renderActiveEditor';
import { useValidation } from '../model/use-validation';
import type { ColumnDef, EditorContext } from '../model/types';

export interface EditModalTarget<TRow> {
  column: ColumnDef<TRow>;
  row: TRow;
  rowId: string;
  value: unknown;
}

export interface EditModalHostProps<TRow> {
  /** Resolves the active cell to its ColumnDef + row + value, or null. */
  getActiveTarget: () => EditModalTarget<TRow> | null;
  /** Where to portal the dialog. */
  portalTarget: HTMLElement | null;
}

export function EditModalHost<TRow>({ getActiveTarget, portalTarget }: EditModalHostProps<TRow>) {
  const editCtx = useEditContext();
  const dialogRef = useRef<HTMLDivElement>(null);
  const target = editCtx?.editState.activeCell ? getActiveTarget() : null;
  const isModal = !!target && target.column.editSurface === 'modal';

  const [draft, setDraft] = useState<unknown>(target?.value);
  const seedKey = target ? `${target.rowId}::${target.column.id}` : null;
  const prevSeedRef = useRef<string | null>(null);
  useEffect(() => {
    if (seedKey !== prevSeedRef.current) {
      prevSeedRef.current = seedKey;
      setDraft(target?.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  const { validation, validateNow } = useValidation<TRow>({
    validate: target?.column.validate,
    value: draft,
    row: (target?.row ?? null) as TRow,
  });

  // Stable refs so the Escape listener always sees fresh handlers.
  const cancel = () => editCtx?.editState.discardEdit();
  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;

  useEffect(() => {
    if (!isModal) return undefined;
    // The hosted editor autofocuses itself. Only move focus to the dialog
    // when nothing inside it already has focus, so we never blur the editor
    // (which would commit/cancel and close the modal immediately).
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) {
      dialog.focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isModal]);

  if (!isModal || !editCtx || !portalTarget || !target) return null;

  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  };

  const commit = async () => {
    if (target.column.validate) {
      const result = await validateNow();
      if (result.status === 'invalid') return;
    }
    editCtx.editState.setPendingValue(draft);
    editCtx.editState.commitEdit();
  };

  const editorContext: EditorContext<TRow> = {
    value: draft,
    row: target.row,
    column: target.column,
    rowId: target.rowId,
    onChange: setDraft,
    onCommit: commit,
    onDiscard: cancel,
    onLookupSelect: (result) =>
      editCtx.onLookupSelect?.(
        target.rowId,
        target.row,
        target.column as ColumnDef<unknown>,
        result,
      ),
    validation,
  };

  return createPortal(
    <div className="strata-modal-backdrop" onPointerDown={cancel}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="strata-modal"
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
      >
        <div className="strata-modal-header">
          {typeof target.column.header === 'string'
            ? target.column.header
            : target.column.id}
        </div>
        <div className="strata-modal-body">
          {renderActiveEditor(editorContext, target.column, { autoFocus: true })}
        </div>
        <div className="strata-modal-footer">
          <button type="button" className="strata-modal-cancel" onClick={cancel}>
            Cancel
          </button>
          <button
            type="button"
            className="strata-modal-commit"
            disabled={
              validation.status === 'invalid' || validation.status === 'validating'
            }
            onClick={commit}
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
