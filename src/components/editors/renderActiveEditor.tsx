import type { ReactNode } from 'react';
import type { EditorContext, ColumnDef } from '../../model/types';
import { renderBuiltInEditor, inferEditorType } from './CellEditor';

export function renderActiveEditor<TRow>(
  ctx: EditorContext<TRow>,
  column: ColumnDef<TRow>,
  opts: { autoFocus: boolean; onNavigateKey?: (event: React.KeyboardEvent) => boolean },
): ReactNode {
  if (column.editor) return column.editor(ctx);
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
