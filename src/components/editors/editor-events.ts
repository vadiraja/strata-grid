import { useEffect, useRef } from 'react';

export interface EditorBehaviorOptions {
  onCommit: () => void;
  onDiscard: () => void;
  autoFocus?: boolean;
  selectOnMount?: boolean;
}

export function useEditorBehavior<T extends HTMLInputElement | HTMLSelectElement>({
  onCommit,
  onDiscard,
  autoFocus = true,
  selectOnMount,
}: EditorBehaviorOptions) {
  const ref = useRef<T>(null);
  const discardedRef = useRef(false);

  useEffect(() => {
    if (!autoFocus) return;

    const element = ref.current;
    if (!element) return;

    element.focus();
    if (selectOnMount && 'select' in element) {
      element.select();
    }
  }, [autoFocus, selectOnMount]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      onCommit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      discardedRef.current = true;
      onDiscard();
    }
  };

  const handleBlur = () => {
    if (!discardedRef.current) {
      onCommit();
    }
  };

  return { ref, handleKeyDown, handleBlur };
}
