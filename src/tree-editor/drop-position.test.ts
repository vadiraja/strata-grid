import { describe, it, expect } from 'vitest';
import { calculateDropPosition } from './drop-position';

describe('calculateDropPosition', () => {
  // rowTop=100, rowHeight=40 → before<110, child[110..130], after>130
  it("returns 'before' when cursor is in the top quarter", () => {
    expect(calculateDropPosition(101, 100, 40)).toBe('before');
    expect(calculateDropPosition(109, 100, 40)).toBe('before');
  });

  it("returns 'child' when cursor is in the middle half", () => {
    expect(calculateDropPosition(110, 100, 40)).toBe('child'); // 25% boundary
    expect(calculateDropPosition(120, 100, 40)).toBe('child');
    expect(calculateDropPosition(130, 100, 40)).toBe('child'); // 75% boundary
  });

  it("returns 'after' when cursor is in the bottom quarter", () => {
    expect(calculateDropPosition(131, 100, 40)).toBe('after');
    expect(calculateDropPosition(139, 100, 40)).toBe('after');
  });

  it('handles cursorY at exact row top', () => {
    expect(calculateDropPosition(100, 100, 40)).toBe('before');
  });

  it("returns 'child' for non-positive rowHeight", () => {
    expect(calculateDropPosition(50, 0, 0)).toBe('child');
    expect(calculateDropPosition(50, 0, -10)).toBe('child');
  });
});
