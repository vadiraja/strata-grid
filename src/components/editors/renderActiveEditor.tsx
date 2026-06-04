import type { ReactNode } from 'react';
import type { EditorContext, ColumnDef } from '../../model/types';
import { renderBuiltInEditor, inferEditorType } from './CellEditor';
import { LookupEditor } from './LookupEditor';

export function renderActiveEditor<TRow>(
  ctx: EditorContext<TRow>,
  column: ColumnDef<TRow>,
  opts: { autoFocus: boolean; onNavigateKey?: (event: React.KeyboardEvent) => boolean },
): ReactNode {
  if (column.editor) return column.editor(ctx);
  if (column.editorType === 'lookup' && column.lookup) {
    return (
      <LookupEditor
        value={ctx.value}
        config={column.lookup}
        row={ctx.row}
        columnId={column.id}
        onChange={ctx.onChange}
        onCommit={ctx.onCommit}
        onDiscard={ctx.onDiscard}
        onSelectResult={(result) => ctx.onLookupSelect?.(result)}
        autoFocus={opts.autoFocus}
        onNavigateKey={opts.onNavigateKey}
      />
    );
  }
  return renderBuiltInEditor(
    column.editorType ?? inferEditorType(ctx.value),
    ctx.value,
    ctx.onChange,
    ctx.onCommit,
    ctx.onDiscard,
    column.editorOptions,
    opts.autoFocus,
    opts.onNavigateKey,
  );
}
