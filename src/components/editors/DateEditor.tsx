import { useEditorBehavior } from './editor-events';

export interface DateEditorProps {
  value: unknown;
  onChange: (value: string) => void;
  onCommit: () => void;
  onDiscard: () => void;
  autoFocus?: boolean;
}

function toDateInputValue(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return String(value ?? '').slice(0, 10);
}

export function DateEditor({
  value,
  onChange,
  onCommit,
  onDiscard,
  autoFocus,
}: DateEditorProps) {
  const { ref, handleKeyDown, handleBlur } = useEditorBehavior<HTMLInputElement>({
    onCommit,
    onDiscard,
    autoFocus,
  });

  return (
    <input
      ref={ref}
      className="strata-editor strata-editor-date"
      type="date"
      value={toDateInputValue(value)}
      aria-label="Edit cell value"
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    />
  );
}
