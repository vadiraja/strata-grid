import type { PointerEvent } from 'react';

export interface FillHandleProps {
  /** Bounding rect of the focus cell relative to the body viewport, or null to hide. */
  anchorRect: { left: number; top: number; width: number; height: number } | null;
  onFillStart: (event: PointerEvent<HTMLDivElement>) => void;
}

export function FillHandle({ anchorRect, onFillStart }: FillHandleProps) {
  if (!anchorRect) return null;
  return (
    <div
      className="strata-fill-handle"
      role="button"
      aria-label="Fill range"
      style={{
        left: anchorRect.left + anchorRect.width - 4,
        top: anchorRect.top + anchorRect.height - 4,
      }}
      onPointerDown={onFillStart}
    />
  );
}
