import { describe, it, expect } from 'vitest';

/**
 * Converts a hex color string to linear RGB values using the WCAG sRGB linearization formula.
 */
function hexToLinearRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const linearize = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return [linearize(r), linearize(g), linearize(b)];
}

/**
 * Computes relative luminance per WCAG 2.1 definition.
 */
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToLinearRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Computes the WCAG contrast ratio between two hex colors.
 * Returns a value >= 1 (lighter color is always L1).
 */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('WCAG Contrast Ratio', () => {
  describe('contrastRatio helper', () => {
    it('returns 21:1 for black on white', () => {
      const ratio = contrastRatio('#000000', '#ffffff');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('returns 1:1 for same color', () => {
      const ratio = contrastRatio('#336699', '#336699');
      expect(ratio).toBeCloseTo(1, 2);
    });

    it('is symmetric (order of arguments does not matter)', () => {
      const r1 = contrastRatio('#000000', '#ffffff');
      const r2 = contrastRatio('#ffffff', '#000000');
      expect(r1).toBeCloseTo(r2, 5);
    });
  });

  describe('high-contrast-light theme', () => {
    const background = '#ffffff';
    const text = '#000000';
    const accent = '#0040DD';
    const muted = '#333333';

    it('text (#000000) on background (#ffffff) meets AAA (≥7:1)', () => {
      const ratio = contrastRatio(text, background);
      expect(ratio).toBeGreaterThanOrEqual(7);
    });

    it('accent (#0040DD) on background (#ffffff) meets AA (≥4.5:1)', () => {
      const ratio = contrastRatio(accent, background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('muted text (#333333) on background (#ffffff) meets AA (≥4.5:1)', () => {
      const ratio = contrastRatio(muted, background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('high-contrast-dark theme', () => {
    const background = '#0a0a0a';
    const text = '#ffffff';
    const accent = '#62B0FF';
    const muted = '#cccccc';

    it('text (#ffffff) on background (#0a0a0a) meets AAA (≥7:1)', () => {
      const ratio = contrastRatio(text, background);
      expect(ratio).toBeGreaterThanOrEqual(7);
    });

    it('accent (#62B0FF) on background (#0a0a0a) meets AA (≥4.5:1)', () => {
      const ratio = contrastRatio(accent, background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('muted text (#cccccc) on background (#0a0a0a) meets AA (≥4.5:1)', () => {
      const ratio = contrastRatio(muted, background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });
});
