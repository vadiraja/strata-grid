import { textFilterFn, numberFilterFn } from './tree-filter-fn';

describe('textFilterFn', () => {
  it('matches when the value contains the filter string (case-insensitive)', () => {
    expect(textFilterFn('Hello World', 'world')).toBe(true);
  });

  it('does not match when the value does not contain the filter string', () => {
    expect(textFilterFn('Hello World', 'xyz')).toBe(false);
  });

  it('matches empty filter against any value', () => {
    expect(textFilterFn('anything', '')).toBe(true);
  });

  it('handles null and undefined values gracefully', () => {
    expect(textFilterFn(null, 'test')).toBe(false);
    expect(textFilterFn(undefined, 'test')).toBe(false);
  });

  it('coerces numbers to strings for matching', () => {
    expect(textFilterFn(42, '4')).toBe(true);
  });
});

describe('numberFilterFn', () => {
  it('matches when the numeric value equals the filter number', () => {
    expect(numberFilterFn(42, '42')).toBe(true);
  });

  it('matches when the value contains the filter as a substring of its string form', () => {
    expect(numberFilterFn(123, '12')).toBe(true);
  });

  it('does not match non-numeric values', () => {
    expect(numberFilterFn('abc', '1')).toBe(false);
  });

  it('handles null and undefined values gracefully', () => {
    expect(numberFilterFn(null, '1')).toBe(false);
    expect(numberFilterFn(undefined, '1')).toBe(false);
  });

  it('matches empty filter against any value', () => {
    expect(numberFilterFn(99, '')).toBe(true);
  });
});
