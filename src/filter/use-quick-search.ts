import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseQuickSearchOptions {
  /** Debounce delay in milliseconds. Default: 300. */
  debounceMs?: number;
}

export interface UseQuickSearchReturn {
  /** The current input value (updates immediately). */
  term: string;
  /** The debounced search term (updates after delay). */
  debouncedTerm: string;
  /** Update the search term. */
  setTerm: (term: string) => void;
  /** Clear the search. */
  clear: () => void;
}

/**
 * Hook providing debounced global search.
 * `term` updates immediately for responsive input; `debouncedTerm` updates
 * after the debounce delay for triggering actual search/filter operations.
 */
export function useQuickSearch(
  options: UseQuickSearchOptions = {},
): UseQuickSearchReturn {
  const { debounceMs = 300 } = options;

  const [term, setTermState] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTerm = useCallback(
    (newTerm: string) => {
      setTermState(newTerm);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setDebouncedTerm(newTerm);
      }, debounceMs);
    },
    [debounceMs],
  );

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setTermState('');
    setDebouncedTerm('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { term, debouncedTerm, setTerm, clear };
}
