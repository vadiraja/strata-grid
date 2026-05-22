import { useEditorBehavior } from './editor-events';

export interface TextEditorProps {
  value: unknown;
  onChange: (value: string) => void;
  onCommit: () => void;
  onDiscard: () => void;
}

export function TextEditor({
  value,
  onChange,
  onCommit,
  onDiscard,
}: TextEditorProps) {
  const { ref, handleKeyDown, handleBlur } = useEditorBehavior<HTMLInputElement>({
    onCommit,
    onDiscard,
    selectOnMount: true,
  });

  return (
    <input
      ref={ref}
      className="strata-editor strata-editor-text"
      type="text"
      value={String(value ?? '')}
      aria-label="Edit cell value"
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    />
  );
}
