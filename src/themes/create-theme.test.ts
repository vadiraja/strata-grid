import { describe, it, expect, afterEach } from 'vitest';
import { createTheme } from './create-theme';
import type { ComposedTheme } from './create-theme';

describe('createTheme', () => {
  const themes: ComposedTheme[] = [];

  afterEach(() => {
    // Dispose all themes created during the test and clean up any leftover style tags
    for (const theme of themes) {
      theme.dispose();
    }
    themes.length = 0;

    // Remove any strata-theme style tags that might have leaked
    document.querySelectorAll('style[id^="strata-theme-"]').forEach((el) => el.remove());
  });

  function track(theme: ComposedTheme): ComposedTheme {
    themes.push(theme);
    return theme;
  }

  describe('style tag injection', () => {
    it('injects a <style> element into document.head', () => {
      const theme = track(
        createTheme('light', { tokens: { '--strata-accent': '#FF6600' } }),
      );

      const styleEl = document.getElementById(theme.className);
      expect(styleEl).not.toBeNull();
      expect(styleEl!.tagName.toLowerCase()).toBe('style');
      expect(document.head.contains(styleEl)).toBe(true);
    });

    it('injected CSS contains the correct token overrides', () => {
      const theme = track(
        createTheme('dark', {
          tokens: {
            '--strata-accent': '#FF0000',
            '--strata-bg-header': '#111111',
          },
        }),
      );

      const styleEl = document.getElementById(theme.className);
      expect(styleEl).not.toBeNull();
      const css = styleEl!.textContent!;
      expect(css).toContain('--strata-accent: #FF0000;');
      expect(css).toContain('--strata-bg-header: #111111;');
      expect(css).toContain(`.${theme.className}`);
    });
  });

  describe('unique IDs', () => {
    it('two calls produce different classNames', () => {
      const theme1 = track(
        createTheme('light', { tokens: { '--strata-accent': '#AAA' } }),
      );
      const theme2 = track(
        createTheme('light', { tokens: { '--strata-accent': '#BBB' } }),
      );

      expect(theme1.className).not.toBe(theme2.className);
    });

    it('classNames are unique even with identical arguments', () => {
      const theme1 = track(
        createTheme('dark', { tokens: { '--strata-accent': '#CCC' } }),
      );
      const theme2 = track(
        createTheme('dark', { tokens: { '--strata-accent': '#CCC' } }),
      );

      expect(theme1.className).not.toBe(theme2.className);
    });
  });

  describe('dispose removes tag', () => {
    it('removes the style element from the DOM after dispose()', () => {
      const theme = createTheme('light', {
        tokens: { '--strata-accent': '#123456' },
      });

      const styleEl = document.getElementById(theme.className);
      expect(styleEl).not.toBeNull();

      theme.dispose();

      const afterDispose = document.getElementById(theme.className);
      expect(afterDispose).toBeNull();
    });
  });

  describe('idempotent dispose', () => {
    it('calling dispose() multiple times does not throw', () => {
      const theme = createTheme('light', {
        tokens: { '--strata-accent': '#AABBCC' },
      });

      expect(() => {
        theme.dispose();
        theme.dispose();
        theme.dispose();
      }).not.toThrow();
    });

    it('calling dispose() multiple times has no additional effect', () => {
      const theme = createTheme('light', {
        tokens: { '--strata-accent': '#DDEEFF' },
      });

      theme.dispose();
      const countAfterFirst = document.querySelectorAll('style[id^="strata-theme-"]').length;

      theme.dispose();
      const countAfterSecond = document.querySelectorAll('style[id^="strata-theme-"]').length;

      expect(countAfterFirst).toBe(countAfterSecond);
    });
  });

  describe('two simultaneous themes do not collide', () => {
    it('both style tags exist independently in the DOM', () => {
      const theme1 = track(
        createTheme('light', { tokens: { '--strata-accent': '#111' } }),
      );
      const theme2 = track(
        createTheme('dark', { tokens: { '--strata-accent': '#222' } }),
      );

      const styleEl1 = document.getElementById(theme1.className);
      const styleEl2 = document.getElementById(theme2.className);

      expect(styleEl1).not.toBeNull();
      expect(styleEl2).not.toBeNull();
      expect(styleEl1).not.toBe(styleEl2);
    });

    it('disposing one theme does not affect the other', () => {
      const theme1 = track(
        createTheme('light', { tokens: { '--strata-accent': '#333' } }),
      );
      const theme2 = track(
        createTheme('dark', { tokens: { '--strata-accent': '#444' } }),
      );

      theme1.dispose();

      const styleEl1 = document.getElementById(theme1.className);
      const styleEl2 = document.getElementById(theme2.className);

      expect(styleEl1).toBeNull();
      expect(styleEl2).not.toBeNull();
    });
  });

  describe('SSR safety', () => {
    it('does not throw when document is undefined', () => {
      const originalDocument = globalThis.document;
      // @ts-expect-error - simulating SSR by removing document
      delete globalThis.document;

      try {
        const theme = createTheme('light', {
          tokens: { '--strata-accent': '#SSRTEST' },
        });

        expect(theme.className).toBeTruthy();
        expect(typeof theme.dispose).toBe('function');

        // dispose should also not throw in SSR
        expect(() => theme.dispose()).not.toThrow();
      } finally {
        globalThis.document = originalDocument;
      }
    });
  });
});
