import { shouldCollapseHorizontalScrollbar } from './horizontal-scrollbar';

describe('shouldCollapseHorizontalScrollbar', () => {
  it('collapses when there is no horizontal overflow', () => {
    expect(shouldCollapseHorizontalScrollbar(0)).toBe(true);
  });

  it('collapses when maxScrollLeft is negative (defensive)', () => {
    expect(shouldCollapseHorizontalScrollbar(-5)).toBe(true);
  });

  it('does not collapse when content overflows', () => {
    expect(shouldCollapseHorizontalScrollbar(120)).toBe(false);
  });
});
