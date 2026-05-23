import type { DropPosition } from '../tree-editor/drop-position';

export interface DropIndicatorProps {
  /** Drop position relative to the parent row. */
  position: DropPosition;
  /** Whether the drop combination is currently valid. */
  isValid: boolean;
}

/**
 * Renders the visual cue for a drag-over row:
 * - `before`/`after` → 2px horizontal line at the row's top/bottom edge
 * - `child`           → background highlight over the whole row
 * Invalid drops swap the indicator to a red/`not-allowed` variant.
 *
 * The component is positioned absolutely and expects its parent to be
 * `position: relative` (i.e., the row).
 */
export function DropIndicator({ position, isValid }: DropIndicatorProps) {
  const variant = isValid ? '' : ' strata-drop-indicator-invalid';
  if (position === 'child') {
    return (
      <div
        className={`strata-drop-indicator-child${variant}`}
        data-position="child"
        aria-hidden="true"
      />
    );
  }
  return (
    <div
      className={`strata-drop-indicator-line strata-drop-indicator-${position}${variant}`}
      data-position={position}
      aria-hidden="true"
    />
  );
}
