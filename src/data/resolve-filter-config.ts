import type {
  ColumnFilterConfig,
  FilterOperator,
  ResolvedColumnFilter,
} from './types';

const TEXT_DEFAULT_OPERATORS: FilterOperator[] = [
  'contains',
  'equals',
  'notEquals',
  'startsWith',
  'endsWith',
  'isEmpty',
  'isNotEmpty',
];

const NUMBER_DEFAULT_OPERATORS: FilterOperator[] = [
  'equals',
  'notEquals',
  'greaterThan',
  'lessThan',
  'greaterOrEqual',
  'lessOrEqual',
  'between',
  'isEmpty',
  'isNotEmpty',
];

const SELECT_SINGLE_DEFAULT_OPERATORS: FilterOperator[] = [
  'equals',
  'notEquals',
];

const SELECT_MULTI_DEFAULT_OPERATORS: FilterOperator[] = ['in', 'notIn'];

const BOOLEAN_DEFAULT_OPERATORS: FilterOperator[] = ['equals'];

const DATE_SINGLE_DEFAULT_OPERATORS: FilterOperator[] = [
  'equals',
  'notEquals',
  'greaterThan',
  'lessThan',
];

const DATE_RANGE_DEFAULT_OPERATORS: FilterOperator[] = ['between'];

/**
 * Normalizes a public `ColumnFilterConfig` (including string shortcuts) into
 * a fully-defaulted `ResolvedColumnFilter` for internal use by the filter UI.
 *
 * String shortcuts:
 * - `'text'` → `{ type: 'text', operators: <text defaults> }`
 * - `'number'` → `{ type: 'number', operators: <number defaults> }`
 */
export function resolveFilterConfig(
  config: ColumnFilterConfig,
): ResolvedColumnFilter {
  if (config === 'text') {
    return { type: 'text', operators: [...TEXT_DEFAULT_OPERATORS] };
  }
  if (config === 'number') {
    return { type: 'number', operators: [...NUMBER_DEFAULT_OPERATORS] };
  }

  switch (config.type) {
    case 'text':
      return {
        type: 'text',
        operators: config.operators ?? [...TEXT_DEFAULT_OPERATORS],
      };
    case 'number':
      return {
        type: 'number',
        operators: config.operators ?? [...NUMBER_DEFAULT_OPERATORS],
      };
    case 'select': {
      const multi = config.multi ?? false;
      const defaults = multi
        ? SELECT_MULTI_DEFAULT_OPERATORS
        : SELECT_SINGLE_DEFAULT_OPERATORS;
      return {
        type: 'select',
        options: config.options,
        multi,
        operators: config.operators ?? [...defaults],
      };
    }
    case 'boolean':
      return {
        type: 'boolean',
        operators: [...BOOLEAN_DEFAULT_OPERATORS],
      };
    case 'date': {
      const range = config.range ?? false;
      const defaults = range
        ? DATE_RANGE_DEFAULT_OPERATORS
        : DATE_SINGLE_DEFAULT_OPERATORS;
      return {
        type: 'date',
        operators: config.operators ?? [...defaults],
        range,
      };
    }
  }
}
