import { useEditorBehavior } from './editor-events';

export interface NumberEditorProps {
  value: unknown;
  onChange: (value: number | null) => void;
  onCommit: () => void;
  onDiscard: () => void;
}

export function NumberEditor({
  value,
  onChange,
  onCommit,
  onDiscard,
}: NumberEditorProps) {
  const { ref, handleKeyDown, handleBlur } = useEditorBehavior<HTMLInputElement>({
    onCommit,
    onDiscard,
    selectOnMount: true,
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    if (rawValue === '') {
      onChange(null);
      return;
    }

    const parsed = Number(rawValue);
    onChange(Number.isNaN(parsed) ? null : parsed);
  };

  return (
    <input
      ref={ref}
      className="strata-editor strata-editor-number"
      type="number"
      value={value === null || value === undefined ? '' : String(value)}
      aria-label="Edit cell value"
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    />
  );
}
