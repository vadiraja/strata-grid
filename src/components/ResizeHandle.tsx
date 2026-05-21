import type { Header } from '@tanstack/react-table';

export interface ResizeHandleProps<TRow> {
  /** The TanStack header whose column is being resized. */
  header: Header<TRow, unknown>;
}

export function ResizeHandle<TRow>({ header }: ResizeHandleProps<TRow>) {
  const resizeHandler = header.getResizeHandler();

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent the parent's HTML5 drag from activating
    e.preventDefault();
    e.stopPropagation();
    resizeHandler(e);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    resizeHandler(e);
  };

  return (
    <div
      className={`strata-resize-handle${
        header.column.getIsResizing() ? ' strata-resize-handle-active' : ''
      }`}
      draggable={false}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize column ${header.column.id}`}
    />
  );
}
