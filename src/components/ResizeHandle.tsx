import type { Header } from '@tanstack/react-table';
import { measureColumnWidth } from '../model/auto-size-column';

export interface ResizeHandleProps<TRow> {
  /** The TanStack header whose column is being resized. */
  header: Header<TRow, unknown>;
  /** Grid root element used to query rendered cells for autosize. */
  gridRootEl?: HTMLElement | null;
  /** Called after measurement so the table can commit the new width. */
  onAutoSize?: (columnId: string, width: number) => void;
}

export function ResizeHandle<TRow>({ header, gridRootEl, onAutoSize }: ResizeHandleProps<TRow>) {
  const resizeHandler = header.getResizeHandler();

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeHandler(e);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!gridRootEl || !onAutoSize) return;
    const width = measureColumnWidth(gridRootEl, header.column.id);
    onAutoSize(header.column.id, width);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    resizeHandler(e);
  };

  return (
    <div
      className={`strata-resize-handle${header.column.getIsResizing() ? ' strata-resize-handle-active' : ''}`}
      draggable={false}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize column ${header.column.id}`}
    />
  );
}
