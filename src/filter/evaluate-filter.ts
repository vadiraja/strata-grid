import type { FilterExpression } from '../data/types';

/**
 * Evaluates a FilterExpression tree against a single row.
 * Used for client-side filtering when the data source doesn't support server-side.
 */
export function evaluateFilter<TRow>(
  row: TRow,
  expression: FilterExpression,
  getValue: (row: TRow, columnId: string) => unknown,
): boolean {
  // Compound expression
  if (expression.children && expression.children.length > 0) {
    const logic = expression.logic ?? 'and';
    if (logic === 'and') {
      return expression.children.every((child) => evaluateFilter(row, child, getValue));
    }
    return expression.children.some((child) => evaluateFilter(row, child, getValue));
  }

  // Leaf condition
  if (!expression.columnId || !expression.operator) {
    return true; // No condition = pass
  }

  const cellValue = getValue(row, expression.columnId);
  const filterValue = expression.value;

  return evaluateOperator(cellValue, expression.operator, filterValue);
}

function evaluateOperator(
  cellValue: unknown,
  operator: string,
  filterValue: unknown,
): boolean {
  const strCell = String(cellValue ?? '').toLowerCase();
  const strFilter = String(filterValue ?? '').toLowerCase();

  switch (operator) {
    case 'equals':
      return cellValue === filterValue || strCell === strFilter;
    case 'notEquals':
      return cellValue !== filterValue && strCell !== strFilter;
    case 'contains':
      return strCell.includes(strFilter);
    case 'notContains':
      return !strCell.includes(strFilter);
    case 'startsWith':
      return strCell.startsWith(strFilter);
    case 'endsWith':
      return strCell.endsWith(strFilter);
    case 'greaterThan':
      return Number(cellValue) > Number(filterValue);
    case 'lessThan':
      return Number(cellValue) < Number(filterValue);
    case 'greaterOrEqual':
      return Number(cellValue) >= Number(filterValue);
    case 'lessOrEqual':
      return Number(cellValue) <= Number(filterValue);
    case 'in':
      return Array.isArray(filterValue) && filterValue.includes(cellValue);
    case 'notIn':
      return Array.isArray(filterValue) && !filterValue.includes(cellValue);
    case 'between': {
      if (!Array.isArray(filterValue) || filterValue.length < 2) return false;
      const [lo, hi] = filterValue;
      if (cellValue == null || lo == null || hi == null) return false;
      // Prefer numeric comparison when all three parse as finite numbers
      const cellNum = Number(cellValue);
      const loNum = Number(lo);
      const hiNum = Number(hi);
      if (
        Number.isFinite(cellNum) &&
        Number.isFinite(loNum) &&
        Number.isFinite(hiNum)
      ) {
        return cellNum >= loNum && cellNum <= hiNum;
      }
      // Lexicographic fallback (works for ISO date strings)
      const cs = String(cellValue);
      return cs >= String(lo) && cs <= String(hi);
    }
    case 'isEmpty':
      return cellValue == null || cellValue === '' || cellValue === undefined;
    case 'isNotEmpty':
      return cellValue != null && cellValue !== '';
    default:
      return true;
  }
}
