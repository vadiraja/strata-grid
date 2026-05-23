import { describe, expect, it } from 'vitest';
import { aggregateFns, aggregateValues } from './aggregate-fns';

describe('aggregateFns', () => {
  it('sums numeric values and ignores non-numeric entries', () => {
    expect(aggregateFns.sum([1, '2', null, undefined, 'x', 3])).toBe(6);
  });

  it('averages numeric values and returns null for no numeric input', () => {
    expect(aggregateFns.avg([2, '4', null, 6])).toBe(4);
    expect(aggregateFns.avg([null, undefined, 'x'])).toBeNull();
  });

  it('returns min and max for numeric values', () => {
    expect(aggregateFns.min([8, '3', null, 5])).toBe(3);
    expect(aggregateFns.max([8, '3', null, 5])).toBe(8);
  });

  it('returns null for empty min and max input', () => {
    expect(aggregateFns.min([])).toBeNull();
    expect(aggregateFns.max([undefined, 'x'])).toBeNull();
  });

  it('counts all values', () => {
    expect(aggregateFns.count([1, null, undefined, 'x'])).toBe(4);
    expect(aggregateFns.count([])).toBe(0);
  });

  it('runs custom aggregate functions', () => {
    expect(aggregateValues((values) => values.join('|'), ['a', 'b'])).toBe(
      'a|b',
    );
  });
});
