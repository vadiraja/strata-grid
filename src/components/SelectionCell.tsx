import { useEffect, useRef } from 'react';

export interface SelectionCellProps {
  /** Whether this row is selected. */
  checked: boolean;
  /** Whether this row is partially selected. */
  indeterminate?: boolean;
  /** Callback when the checkbox changes. */
  onChange: (checked: boolean) => void;
  /** Row id for the accessible label. */
  rowId: string;
  /** Whether this cell is the active keyboard cell. */
  isFocused?: boolean;
  /** Stable active-descendant id when focused. */
  focusId?: string;
  /** Called when this selection cell is selected/focused by pointer. */
  onFocusCell?: () => void;
}

export function SelectionCell({
  checked,
  indeterminate = false,
  onChange,
  rowId,
  isFocused,
  focusId,
  onFocusCell,
}: SelectionCellProps) {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <div
      className={`strata-cell strata-selection-cell${isFocused ? ' strata-cell-focused' : ''}`}
      role="gridcell"
      id={isFocused ? focusId : undefined}
      onClick={onFocusCell}
    >
      <input
        ref={checkboxRef}
        type="checkbox"
        className="strata-checkbox"
        checked={checked}
        aria-checked={indeterminate ? 'mixed' : checked}
        aria-label={`Select row ${rowId}`}
        tabIndex={-1}
        onChange={(event) => onChange(event.currentTarget.checked)}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
