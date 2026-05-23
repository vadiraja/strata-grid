import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Density token resolution tests.
 *
 * These tests parse the density.css file directly and assert that the correct
 * CSS custom property values are defined for each density level.
 */

const densityCss = readFileSync(
  resolve(__dirname, 'density.css'),
  'utf-8',
);

/** Extract token values for a given density selector from the CSS source. */
function extractTokens(css: string, density: string): Record<string, string> {
  // Match the rule block for the given density attribute selector
  const selectorPattern = new RegExp(
    `\\.strata-grid\\[data-strata-density="${density}"\\]\\s*\\{([^}]+)\\}`,
  );
  const match = css.match(selectorPattern);
  if (!match) return {};

  const block = match[1];
  const tokens: Record<string, string> = {};

  // Parse each custom property declaration
  const declPattern = /(--strata-[\w-]+)\s*:\s*([^;]+);/g;
  let declMatch: RegExpExecArray | null;
  while ((declMatch = declPattern.exec(block)) !== null) {
    tokens[declMatch[1]] = declMatch[2].trim();
  }

  return tokens;
}

describe('density.css — token resolution', () => {
  describe('compact density', () => {
    const tokens = extractTokens(densityCss, 'compact');

    it('sets --strata-row-height to 24px', () => {
      expect(tokens['--strata-row-height']).toBe('24px');
    });

    it('sets --strata-cell-padding-y to 2px', () => {
      expect(tokens['--strata-cell-padding-y']).toBe('2px');
    });

    it('sets --strata-cell-padding-x to 6px', () => {
      expect(tokens['--strata-cell-padding-x']).toBe('6px');
    });
  });

  describe('standard density', () => {
    const tokens = extractTokens(densityCss, 'standard');

    it('sets --strata-row-height to 32px', () => {
      expect(tokens['--strata-row-height']).toBe('32px');
    });

    it('sets --strata-cell-padding-y to 6px', () => {
      expect(tokens['--strata-cell-padding-y']).toBe('6px');
    });

    it('sets --strata-cell-padding-x to 10px', () => {
      expect(tokens['--strata-cell-padding-x']).toBe('10px');
    });
  });

  describe('comfortable density', () => {
    const tokens = extractTokens(densityCss, 'comfortable');

    it('sets --strata-row-height to 44px', () => {
      expect(tokens['--strata-row-height']).toBe('44px');
    });

    it('sets --strata-cell-padding-y to 10px', () => {
      expect(tokens['--strata-cell-padding-y']).toBe('10px');
    });

    it('sets --strata-cell-padding-x to 12px', () => {
      expect(tokens['--strata-cell-padding-x']).toBe('12px');
    });
  });

  describe('ordering invariant', () => {
    const compactTokens = extractTokens(densityCss, 'compact');
    const standardTokens = extractTokens(densityCss, 'standard');
    const comfortableTokens = extractTokens(densityCss, 'comfortable');

    it('compact row height < standard row height < comfortable row height', () => {
      const compactHeight = parseInt(compactTokens['--strata-row-height'], 10);
      const standardHeight = parseInt(standardTokens['--strata-row-height'], 10);
      const comfortableHeight = parseInt(comfortableTokens['--strata-row-height'], 10);

      expect(compactHeight).toBeLessThan(standardHeight);
      expect(standardHeight).toBeLessThan(comfortableHeight);
    });

    it('compact cell-padding-y < standard cell-padding-y < comfortable cell-padding-y', () => {
      const compactPadY = parseInt(compactTokens['--strata-cell-padding-y'], 10);
      const standardPadY = parseInt(standardTokens['--strata-cell-padding-y'], 10);
      const comfortablePadY = parseInt(comfortableTokens['--strata-cell-padding-y'], 10);

      expect(compactPadY).toBeLessThan(standardPadY);
      expect(standardPadY).toBeLessThan(comfortablePadY);
    });

    it('compact cell-padding-x < standard cell-padding-x < comfortable cell-padding-x', () => {
      const compactPadX = parseInt(compactTokens['--strata-cell-padding-x'], 10);
      const standardPadX = parseInt(standardTokens['--strata-cell-padding-x'], 10);
      const comfortablePadX = parseInt(comfortableTokens['--strata-cell-padding-x'], 10);

      expect(compactPadX).toBeLessThan(standardPadX);
      expect(standardPadX).toBeLessThan(comfortablePadX);
    });
  });
});
