export interface EditToggleProps {
  /** Whether editing is currently enabled. */
  editing: boolean;
  /** Called with the next editing state when the toggle is clicked. */
  onChange: (next: boolean) => void;
}

/** A small button that toggles the grid's whole-grid edit mode on and off. */
export function EditToggle({ editing, onChange }: EditToggleProps) {
  return (
    <button
      type="button"
      className={'strata-edit-toggle' + (editing ? ' strata-edit-toggle--on' : '')}
      aria-pressed={editing}
      onClick={() => onChange(!editing)}
    >
      {editing ? 'Done' : 'Edit'}
    </button>
  );
}
