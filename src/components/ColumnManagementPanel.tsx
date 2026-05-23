import { useState, type FC } from 'react';
import { StrataIcon } from '../icons';

export interface ColumnManagementPanelProps {
  columns: { id: string; header: string }[];
  hiddenColumns: string[];
  alwaysVisible?: string[];
  searchable?: boolean;
  onToggleColumn: (columnId: string) => void;
  onMoveColumn: (columnId: string, toIndex: number) => void;
  onReset: () => void;
  onClose: () => void;
}

export const ColumnManagementPanel: FC<ColumnManagementPanelProps> = ({
  columns,
  hiddenColumns,
  alwaysVisible = [],
  searchable = true,
  onToggleColumn,
  onReset,
  onClose,
}) => {
  const [search, setSearch] = useState('');

  const filteredColumns = search
    ? columns.filter((c) =>
        (typeof c.header === 'string' ? c.header : c.id)
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : columns;

  return (
    <div className="strata-column-panel" role="dialog" aria-label="Column management">
      <div className="strata-column-panel-header">
        <h3 className="strata-column-panel-title">Columns</h3>
        <button onClick={onClose} aria-label="Close" className="strata-column-panel-close">
          ×
        </button>
      </div>

      {searchable && (
        <div className="strata-column-panel-search">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search columns..."
            aria-label="Search columns"
            className="strata-column-panel-search-input"
          />
        </div>
      )}

      <ul className="strata-column-panel-list" role="list">
        {filteredColumns.map((col) => {
          const isHidden = hiddenColumns.includes(col.id);
          const isLocked = alwaysVisible.includes(col.id);

          return (
            <li key={col.id} className="strata-column-panel-item">
              <button
                className="strata-column-panel-toggle"
                onClick={() => onToggleColumn(col.id)}
                disabled={isLocked}
                aria-label={`Toggle ${col.header}`}
                aria-pressed={!isHidden}
              >
                <span className="strata-column-panel-icon">
                  {isHidden ? (
                    <StrataIcon name="eye-off" />
                  ) : (
                    <StrataIcon name="check" />
                  )}
                </span>
                <span>{col.header}</span>
                {isLocked && <span className="strata-column-panel-locked">(locked)</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="strata-column-panel-footer">
        <button onClick={onReset} className="strata-column-panel-reset">
          Reset to default
        </button>
      </div>
    </div>
  );
};
