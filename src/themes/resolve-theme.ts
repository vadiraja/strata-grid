import type { GridTheme } from '../model/types';

const BUILT_IN_THEMES = new Set<string>([
  'light',
  'dark',
  'high-contrast-light',
  'high-contrast-dark',
]);

/**
 * Resolves a GridTheme value into either a `data-theme` attribute or a
 * className to apply on the grid root element.
 *
 * - Built-in literals → `{ dataTheme: literal }`
 * - `'auto'` → `{ dataTheme: osScheme }`
 * - Any other string (e.g. from createTheme) → `{ className: theme }`
 * - `undefined` → `{ dataTheme: 'light' }`
 */
export function resolveTheme(
  theme: GridTheme | undefined,
  osScheme: 'light' | 'dark',
): { dataTheme?: string; className?: string } {
  if (theme === undefined || theme === 'light') {
    return { dataTheme: 'light' };
  }

  if (theme === 'auto') {
    return { dataTheme: osScheme };
  }

  if (BUILT_IN_THEMES.has(theme)) {
    return { dataTheme: theme };
  }

  // Any other string is treated as a className (e.g. from createTheme)
  return { className: theme };
}
