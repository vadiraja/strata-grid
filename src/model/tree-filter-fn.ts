/**
 * Text filter function: case-insensitive substring match.
 *
 * Returns `true` if the stringified cell value contains the filter text.
 * Null/undefined values never match (unless the filter is empty).
 * An empty filter matches everything.
 */
export function textFilterFn(cellValue: unknown, filterValue: string): boolean {
  if (filterValue === '') return true;
  if (cellValue == null) return false;
  return String(cellValue).toLowerCase().includes(filterValue.toLowerCase());
}

/**
 * Number filter function: matches if the numeric string representation
 * of the cell value contains the filter string.
 *
 * Returns `true` if the value is numeric and its string form contains
 * the filter text. Null/undefined or non-numeric values never match.
 * An empty filter matches everything.
 */
export function numberFilterFn(cellValue: unknown, filterValue: string): boolean {
  if (filterValue === '') return true;
  if (cellValue == null) return false;
  const num = Number(cellValue);
  if (Number.isNaN(num)) return false;
  return String(num).includes(filterValue);
}
