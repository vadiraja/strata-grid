import { useState, type FC } from 'react';

export interface ExportMenuProps {
  /** Which formats to show in the menu. */
  formats: ('csv' | 'xlsx')[];
  /** Called when the user selects a format. */
  onExport: (format: 'csv' | 'xlsx') => void;
  /** Disable the export button. */
  disabled?: boolean;
}

/**
 * Dropdown menu for selecting export format.
 */
export const ExportMenu: FC<ExportMenuProps> = ({ formats, onExport, disabled }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="strata-export-menu">
      <button
        className="strata-export-btn"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        aria-label="Export data"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Export ▾
      </button>
      {open && (
        <ul className="strata-export-dropdown" role="menu">
          {formats.includes('csv') && (
            <li role="none">
              <button
                role="menuitem"
                onClick={() => {
                  onExport('csv');
                  setOpen(false);
                }}
                className="strata-export-option"
              >
                Export as CSV
              </button>
            </li>
          )}
          {formats.includes('xlsx') && (
            <li role="none">
              <button
                role="menuitem"
                onClick={() => {
                  onExport('xlsx');
                  setOpen(false);
                }}
                className="strata-export-option"
              >
                Export as Excel
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
