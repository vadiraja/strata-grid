import type { FC } from 'react';

const INDENT_PX = 24;

export interface LoadingRowProps {
  /** Tree depth for indentation. */
  depth: number;
  /** Error message (renders error state instead of loading). */
  error?: string;
  /** Retry callback for error state. */
  onRetry?: () => void;
  /** Row height in pixels. */
  height?: number;
}

/**
 * Placeholder row shown while a tree node's children are being loaded.
 * Shows a skeleton animation in normal state, or an error with retry in error state.
 */
export const LoadingRow: FC<LoadingRowProps> = ({
  depth,
  error,
  onRetry,
  height = 36,
}) => {
  const indentPx = depth * INDENT_PX;

  if (error) {
    return (
      <div
        role="row"
        className="strata-row strata-row-loading strata-row-error"
        style={{ height }}
      >
        <div className="strata-loading-indent" style={{ paddingLeft: `${indentPx}px` }}>
          <span className="strata-loading-error-message">{error}</span>
          {onRetry && (
            <button
              className="strata-loading-retry-btn"
              onClick={onRetry}
              aria-label="Retry loading"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="row"
      className="strata-row strata-row-loading"
      style={{ height }}
      aria-busy="true"
    >
      <div className="strata-loading-indent" style={{ paddingLeft: `${indentPx}px` }}>
        <div className="strata-loading-skeleton" />
      </div>
    </div>
  );
};
