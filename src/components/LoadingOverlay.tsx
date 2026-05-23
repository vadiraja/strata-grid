import type { FC } from 'react';

export interface LoadingOverlayProps {
  /** Whether the overlay is visible. */
  visible: boolean;
}

/**
 * Full-grid loading overlay shown during server-side operations.
 * Semi-transparent backdrop with a centered spinner.
 */
export const LoadingOverlay: FC<LoadingOverlayProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="strata-loading-overlay">
      <div
        role="status"
        aria-label="Loading data"
        className="strata-loading-spinner"
      >
        <svg
          className="strata-spinner-icon"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="60"
            strokeDashoffset="20"
          />
        </svg>
      </div>
    </div>
  );
};
