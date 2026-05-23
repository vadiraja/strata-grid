import { describe, it, expect } from 'vitest';
import { resolveTheme } from './resolve-theme';

describe('resolveTheme', () => {
  it('undefined → { dataTheme: "light" }', () => {
    expect(resolveTheme(undefined, 'light')).toEqual({ dataTheme: 'light' });
    expect(resolveTheme(undefined, 'dark')).toEqual({ dataTheme: 'light' });
  });

  it('"light" → { dataTheme: "light" }', () => {
    expect(resolveTheme('light', 'light')).toEqual({ dataTheme: 'light' });
    expect(resolveTheme('light', 'dark')).toEqual({ dataTheme: 'light' });
  });

  it('"dark" → { dataTheme: "dark" }', () => {
    expect(resolveTheme('dark', 'light')).toEqual({ dataTheme: 'dark' });
    expect(resolveTheme('dark', 'dark')).toEqual({ dataTheme: 'dark' });
  });

  it('"high-contrast-light" → { dataTheme: "high-contrast-light" }', () => {
    expect(resolveTheme('high-contrast-light', 'light')).toEqual({
      dataTheme: 'high-contrast-light',
    });
    expect(resolveTheme('high-contrast-light', 'dark')).toEqual({
      dataTheme: 'high-contrast-light',
    });
  });

  it('"high-contrast-dark" → { dataTheme: "high-contrast-dark" }', () => {
    expect(resolveTheme('high-contrast-dark', 'light')).toEqual({
      dataTheme: 'high-contrast-dark',
    });
    expect(resolveTheme('high-contrast-dark', 'dark')).toEqual({
      dataTheme: 'high-contrast-dark',
    });
  });

  it('"auto" with osScheme="dark" → { dataTheme: "dark" }', () => {
    expect(resolveTheme('auto', 'dark')).toEqual({ dataTheme: 'dark' });
  });

  it('"auto" with osScheme="light" → { dataTheme: "light" }', () => {
    expect(resolveTheme('auto', 'light')).toEqual({ dataTheme: 'light' });
  });

  it('arbitrary string (className from createTheme) → { className: string }', () => {
    expect(resolveTheme('strata-theme-custom-123', 'light')).toEqual({
      className: 'strata-theme-custom-123',
    });
    expect(resolveTheme('strata-theme-custom-123', 'dark')).toEqual({
      className: 'strata-theme-custom-123',
    });
  });
});
