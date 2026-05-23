import { useState, type FC } from 'react';

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
              <label className="strata-column-panel-label">
                <input
                  type="checkbox"
                  checked={!isHidden}
                  onChange={() => onToggleColumn(col.id)}
                  disabled={isLocked}
                  aria-label={`Toggle ${col.header}`}
                />
                <span>{col.header}</span>
                {isLocked && <span className="strata-column-panel-locked">(locked)</span>}
              </label>
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
