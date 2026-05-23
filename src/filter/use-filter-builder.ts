import { useState, useCallback } from 'react';
import type { FilterExpression } from '../data/types';

export interface UseFilterBuilderReturn {
  /** The current filter expression tree. */
  expression: FilterExpression;
  /** Add a leaf condition to the root group. */
  addCondition: (condition: Partial<FilterExpression>) => void;
  /** Remove a condition by index. */
  removeCondition: (index: number) => void;
  /** Update a condition at index. */
  updateCondition: (index: number, updates: Partial<FilterExpression>) => void;
  /** Toggle root logic between AND and OR. */
  toggleLogic: () => void;
  /** Clear all conditions. */
  clear: () => void;
  /** Whether all conditions are valid (have column + operator). */
  isValid: boolean;
}

/**
 * Hook managing the filter builder expression tree.
 * Provides CRUD operations on filter conditions and logic toggling.
 */
export function useFilterBuilder(
  initial?: FilterExpression,
): UseFilterBuilderReturn {
  const [expression, setExpression] = useState<FilterExpression>(
    initial ?? { logic: 'and', children: [] },
  );

  const addCondition = useCallback((condition: Partial<FilterExpression>) => {
    setExpression((prev) => ({
      ...prev,
      children: [...(prev.children ?? []), condition as FilterExpression],
    }));
  }, []);

  const removeCondition = useCallback((index: number) => {
    setExpression((prev) => ({
      ...prev,
      children: (prev.children ?? []).filter((_, i) => i !== index),
    }));
  }, []);

  const updateCondition = useCallback(
    (index: number, updates: Partial<FilterExpression>) => {
      setExpression((prev) => ({
        ...prev,
        children: (prev.children ?? []).map((child, i) =>
          i === index ? { ...child, ...updates } : child,
        ),
      }));
    },
    [],
  );

  const toggleLogic = useCallback(() => {
    setExpression((prev) => ({
      ...prev,
      logic: prev.logic === 'and' ? 'or' : 'and',
    }));
  }, []);

  const clear = useCallback(() => {
    setExpression((prev) => ({ ...prev, children: [] }));
  }, []);

  const isValid = (expression.children ?? []).every(
    (child) => child.columnId && child.operator,
  );

  return {
    expression,
    addCondition,
    removeCondition,
    updateCondition,
    toggleLogic,
    clear,
    isValid,
  };
}
