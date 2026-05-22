import { useEffect, useRef } from 'react';

export interface SelectionHeaderCellProps {
  /** Whether every selectable row is selected. */
  checked: boolean;
  /** Whether some, but not all, selectable rows are selected. */
  indeterminate: boolean;
  /** Callback when the select-all checkbox changes. */
  onChange: (checked: boolean) => void;
}

export function SelectionHeaderCell({
  checked,
  indeterminate,
  onChange,
}: SelectionHeaderCellProps) {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <div
      className="strata-header-cell strata-selection-cell"
      role="columnheader"
    >
      <input
        ref={checkboxRef}
        type="checkbox"
        className="strata-checkbox"
        checked={checked}
        aria-checked={indeterminate ? 'mixed' : checked}
        aria-label="Select all rows"
        tabIndex={-1}
        onChange={(event) => onChange(event.currentTarget.checked)}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
