import type { Header } from '@tanstack/react-table';

export interface ResizeHandleProps<TRow> {
  /** The TanStack header whose column is being resized. */
  header: Header<TRow, unknown>;
}

export function ResizeHandle<TRow>({ header }: ResizeHandleProps<TRow>) {
  return (
    <div
      className={`strata-resize-handle${
        header.column.getIsResizing() ? ' strata-resize-handle-active' : ''
      }`}
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize column ${header.column.id}`}
    />
  );
}
