import { useEffect, useRef, useState } from 'react';
import type { LookupConfig } from '../../model/types';
import { useEditorBehavior } from './editor-events';

export interface LookupEditorProps<TRow, TResult = Record<string, unknown>> {
  value: unknown;
  config: LookupConfig<TRow, TResult>;
  row: TRow;
  columnId: string;
  onChange: (value: unknown) => void;
  onCommit: () => void;
  onDiscard: () => void;
  onSelectResult: (result: TResult) => void;
  autoFocus?: boolean;
  onNavigateKey?: (e: React.KeyboardEvent) => boolean;
}

function initialQuery(value: unknown): string {
  if (value && typeof value === 'object' && 'label' in value) {
    const label = (value as { label: unknown }).label;
    return label == null ? '' : String(label);
  }
  return '';
}

export function LookupEditor<TRow, TResult = Record<string, unknown>>({
  value,
  config,
  row,
  columnId,
  onChange,
  onCommit,
  onDiscard,
  onSelectResult,
  autoFocus,
  onNavigateKey,
}: LookupEditorProps<TRow, TResult>) {
  const [query, setQuery] = useState(() => initialQuery(value));
  const [results, setResults] = useState<TResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [open, setOpen] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const selectedRef = useRef(false);

  const { ref, handleKeyDown, handleBlur } = useEditorBehavior<HTMLInputElement>({
    onCommit,
    onDiscard,
    autoFocus,
    onNavigateKey,
  });

  const minChars = config.minChars ?? 1;
  const debounceMs = config.debounceMs ?? 250;

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (query.length < minChars) {
      requestIdRef.current += 1;
      setResults([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    setLoading(true);
    setOpen(true);
    const requestId = ++requestIdRef.current;
    timerRef.current = setTimeout(() => {
      void config.search(query, { row, columnId }).then((searchResults) => {
        if (requestId !== requestIdRef.current) return;
        setResults(searchResults);
        setLoading(false);
        setOpen(true);
        setHighlight(0);
      });
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function defaultGetValue(result: TResult): { id: unknown; label: unknown } {
    const record = result as Record<string, unknown>;
    const idField = config.idField ?? 'id';
    const label = config.labelField
      ? record[config.labelField]
      : (record.label ?? record.name);
    return { id: record[idField], label };
  }

  function select(result: TResult) {
    if (selectedRef.current) return;
    selectedRef.current = true;
    onChange(config.getValue ? config.getValue(result) : defaultGetValue(result));
    onSelectResult(result);
    onCommit();
  }

  function onInputKeyDown(event: React.KeyboardEvent) {
    if (open && results.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlight((h) => Math.min(h + 1, results.length - 1));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        select(results[highlight]);
        return;
      }
    }
    handleKeyDown(event);
  }

  return (
    <div className="strata-lookup">
      <input
        ref={ref}
        className="strata-editor strata-lookup-input"
        type="text"
        value={query}
        aria-label="Edit cell value"
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onInputKeyDown}
        onBlur={handleBlur}
      />
      {open && (
        <ul className="strata-lookup-list">
          {loading ? (
            <li className="strata-lookup-loading">Searching...</li>
          ) : results.length === 0 ? (
            <li className="strata-lookup-empty">No results</li>
          ) : (
            results.map((result, index) => (
              <li
                key={index}
                className={
                  'strata-lookup-option' +
                  (index === highlight ? ' strata-lookup-option--active' : '')
                }
                onMouseDown={(event) => {
                  // preventDefault keeps focus on the input so blur-commit
                  // does not fire before selection completes.
                  event.preventDefault();
                  select(result);
                }}
                onClick={() => select(result)}
              >
                {config.renderOption
                  ? config.renderOption(result)
                  : String(defaultGetValue(result).label ?? '')}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
