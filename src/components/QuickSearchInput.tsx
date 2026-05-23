import type { FC } from 'react';
import { StrataIcon } from '../icons';

export interface QuickSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export const QuickSearchInput: FC<QuickSearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
}) => (
  <div className="strata-quick-search">
    <StrataIcon name="search" className="strata-quick-search-icon" />
    <input
      type="search"
      className="strata-quick-search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label="Quick search"
    />
    {value && (
      <button
        className="strata-quick-search-clear"
        onClick={onClear}
        aria-label="Clear search"
      >
        ×
      </button>
    )}
  </div>
);
