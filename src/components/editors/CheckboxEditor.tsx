import { useEffect, useRef } from 'react';

export interface CheckboxEditorProps {
  value: unknown;
  onChange: (value: boolean) => void;
  onCommit: () => void;
  onDiscard: () => void;
  autoFocus?: boolean;
}

export function CheckboxEditor({
  value,
  onChange,
  onCommit,
  onDiscard,
  autoFocus = true,
}: CheckboxEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <input
      ref={inputRef}
      className="strata-editor strata-editor-checkbox"
      type="checkbox"
      checked={Boolean(value)}
      aria-label="Edit cell value"
      onChange={(event) => {
        onChange(event.target.checked);
        onCommit();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          onDiscard();
        } else if (event.key === 'Enter') {
          event.preventDefault();
          onCommit();
        }
      }}
    />
  );
}
