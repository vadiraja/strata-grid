import type { FC } from 'react';
import type { FilterExpression } from '../data/types';

export interface FilterBuilderPanelProps {
  expression: FilterExpression;
  columns: { id: string; header: string }[];
  onAddCondition: () => void;
  onRemoveCondition: (index: number) => void;
  onUpdateCondition: (index: number, updates: Partial<FilterExpression>) => void;
  onToggleLogic: () => void;
  onClear: () => void;
  onApply: () => void;
}

export const FilterBuilderPanel: FC<FilterBuilderPanelProps> = ({
  expression,
  columns,
  onAddCondition,
  onRemoveCondition,
  onUpdateCondition,
  onToggleLogic,
  onClear,
  onApply,
}) => {
  const conditions = expression.children ?? [];

  return (
    <div className="strata-filter-builder" role="region" aria-label="Filter builder">
      <div className="strata-filter-builder-header">
        <button
          className="strata-filter-logic-toggle"
          onClick={onToggleLogic}
          aria-label={`Logic: ${expression.logic?.toUpperCase()}`}
        >
          {expression.logic?.toUpperCase() ?? 'AND'}
        </button>
        <span className="strata-filter-builder-title">Filter conditions</span>
      </div>

      <div className="strata-filter-conditions">
        {conditions.map((condition, index) => (
          <div key={index} className="strata-filter-condition-row">
            <select
              value={condition.columnId ?? ''}
              onChange={(e) => onUpdateCondition(index, { columnId: e.target.value })}
              aria-label="Filter column"
              className="strata-filter-col-select"
            >
              <option value="">Select column</option>
              {columns.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.header}
                </option>
              ))}
            </select>

            <select
              value={condition.operator ?? ''}
              onChange={(e) => onUpdateCondition(index, { operator: e.target.value as FilterExpression['operator'] })}
              aria-label="Filter operator"
              className="strata-filter-op-select"
            >
              <option value="">Operator</option>
              <option value="equals">Equals</option>
              <option value="notEquals">Not equals</option>
              <option value="contains">Contains</option>
              <option value="startsWith">Starts with</option>
              <option value="endsWith">Ends with</option>
              <option value="greaterThan">Greater than</option>
              <option value="lessThan">Less than</option>
              <option value="isEmpty">Is empty</option>
              <option value="isNotEmpty">Is not empty</option>
            </select>

            <input
              type="text"
              value={String(condition.value ?? '')}
              onChange={(e) => onUpdateCondition(index, { value: e.target.value })}
              aria-label="Filter value"
              className="strata-filter-value-input"
              placeholder="Value"
            />

            <button
              onClick={() => onRemoveCondition(index)}
              aria-label="Remove condition"
              className="strata-filter-remove-btn"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="strata-filter-builder-actions">
        <button onClick={onAddCondition} className="strata-filter-add-btn">
          + Add condition
        </button>
        <div className="strata-filter-builder-buttons">
          <button onClick={onClear} className="strata-filter-clear-btn">
            Clear
          </button>
          <button onClick={onApply} className="strata-filter-apply-btn">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
