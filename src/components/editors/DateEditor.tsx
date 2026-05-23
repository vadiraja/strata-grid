import { useEditorBehavior } from './editor-events';

export interface DateEditorProps {
  value: unknown;
  onChange: (value: string) => void;
  onCommit: () => void;
  onDiscard: () => void;
  autoFocus?: boolean;
  onNavigateKey?: (event: React.KeyboardEvent) => boolean;
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
  onNavigateKey,
}: DateEditorProps) {
  const { ref, handleKeyDown, handleBlur } = useEditorBehavior<HTMLInputElement>({
    onCommit,
    onDiscard,
    autoFocus,
    onNavigateKey,
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
