import type { FC } from 'react';
import { StrataIcon } from '../icons';

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
        <StrataIcon name="loader-2" className="strata-spinner" label="Loading" />
      </div>
    </div>
  );
};
