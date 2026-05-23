import { describe, it, afterEach } from 'vitest';
import fc from 'fast-check';
import { createTheme } from './create-theme';
import type { ComposedTheme } from './create-theme';

/**
 * Property-based tests for createTheme using fast-check.
 *
 * **Validates: Requirements 5.1, 5.3, 5.4**
 */
describe('createTheme property-based tests', () => {
  afterEach(() => {
    // Clean up any leftover style tags after each test
    document.querySelectorAll('style[id^="strata-theme-"]').forEach((el) => el.remove());
  });

  /**
   * Property 1: Uniqueness
   *
   * For any N calls to createTheme (with arbitrary base themes and token overrides),
   * all returned classNames are distinct.
   *
   * **Validates: Requirements 5.1, 5.3**
   */
  it('all classNames are unique across N calls', () => {
    const baseThemes = ['light', 'dark', 'high-contrast-light', 'high-contrast-dark'] as const;

    fc.assert(
      fc.property(fc.integer({ min: 2, max: 20 }), (n) => {
        const themes: ComposedTheme[] = Array.from({ length: n }, () =>
          createTheme(baseThemes[Math.floor(Math.random() * baseThemes.length)], {
            tokens: { '--strata-accent': '#000' },
          }),
        );
        const classNames = themes.map((t) => t.className);
        const unique = new Set(classNames);
        // cleanup
        themes.forEach((t) => t.dispose());
        return unique.size === classNames.length;
      }),
    );
  });

  /**
   * Property 2: Idempotent dispose
   *
   * For any ComposedTheme, calling dispose() any number of times (1+) leaves the DOM
   * in the same state as calling it once — the style element is removed and stays removed.
   *
   * **Validates: Requirements 5.4**
   */
  it('dispose is idempotent — calling it N times has the same effect as calling it once', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (disposeCount) => {
        const theme = createTheme('dark', { tokens: { '--strata-bg': '#111' } });
        for (let i = 0; i < disposeCount; i++) theme.dispose();
        return document.getElementById(theme.className) === null;
      }),
    );
  });
});
