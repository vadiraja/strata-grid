import { useEditorBehavior } from './editor-events';

export interface SelectChoice {
  value: string | number | boolean;
  label: string;
}

export interface SelectEditorProps {
  value: unknown;
  choices: SelectChoice[];
  onChange: (value: SelectChoice['value']) => void;
  onCommit: () => void;
  onDiscard: () => void;
}

export function SelectEditor({
  value,
  choices,
  onChange,
  onCommit,
  onDiscard,
}: SelectEditorProps) {
  const { ref, handleKeyDown, handleBlur } = useEditorBehavior<HTMLSelectElement>({
    onCommit,
    onDiscard,
  });
  const selectedIndex = choices.findIndex((choice) => choice.value === value);

  return (
    <select
      ref={ref}
      className="strata-editor strata-editor-select"
      value={selectedIndex >= 0 ? String(selectedIndex) : ''}
      aria-label="Edit cell value"
      onChange={(event) => {
        const choice = choices[Number(event.target.value)];
        if (choice) onChange(choice.value);
      }}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      {selectedIndex < 0 && <option value="">Select...</option>}
      {choices.map((choice, index) => (
        <option key={`${String(choice.value)}-${choice.label}`} value={String(index)}>
          {choice.label}
        </option>
      ))}
    </select>
  );
}
