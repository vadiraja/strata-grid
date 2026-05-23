import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Scrollbar custom property resolution tests.
 *
 * Verifies that scrollbar CSS tokens resolve correctly at each density level.
 * Since JSDOM doesn't support CSS custom property resolution from stylesheets,
 * we parse the CSS source files directly and assert the expected token values.
 */

const densityCss = readFileSync(resolve(__dirname, 'density.css'), 'utf-8');
const tokensCss = readFileSync(resolve(__dirname, 'tokens.css'), 'utf-8');

/** Extract token values from a density attribute selector block. */
function extractDensityTokens(css: string, density: string): Record<string, string> {
  const selectorPattern = new RegExp(
    `\\.strata-grid\\[data-strata-density="${density}"\\]\\s*\\{([^}]+)\\}`,
  );
  const match = css.match(selectorPattern);
  if (!match) return {};

  const block = match[1];
  const tokens: Record<string, string> = {};

  const declPattern = /(--strata-[\w-]+)\s*:\s*([^;]+);/g;
  let declMatch: RegExpExecArray | null;
  while ((declMatch = declPattern.exec(block)) !== null) {
    tokens[declMatch[1]] = declMatch[2].trim();
  }

  return tokens;
}

/** Extract token values from the base .strata-grid rule in tokens.css. */
function extractBaseTokens(css: string): Record<string, string> {
  const selectorPattern = /\.strata-grid\s*\{([^}]+)\}/;
  const match = css.match(selectorPattern);
  if (!match) return {};

  const block = match[1];
  const tokens: Record<string, string> = {};

  const declPattern = /(--strata-[\w-]+)\s*:\s*([^;]+);/g;
  let declMatch: RegExpExecArray | null;
  while ((declMatch = declPattern.exec(block)) !== null) {
    tokens[declMatch[1]] = declMatch[2].trim();
  }

  return tokens;
}

describe('scrollbar custom properties — density resolution', () => {
  const baseTokens = extractBaseTokens(tokensCss);

  describe('compact density', () => {
    const tokens = extractDensityTokens(densityCss, 'compact');

    it('sets --strata-scrollbar-size to 8px', () => {
      expect(tokens['--strata-scrollbar-size']).toBe('8px');
    });

    it('sets --strata-scrollbar-width to thin', () => {
      expect(tokens['--strata-scrollbar-width']).toBe('thin');
    });
  });

  describe('standard density (defaults from tokens.css)', () => {
    it('base tokens define --strata-scrollbar-size as 12px', () => {
      expect(baseTokens['--strata-scrollbar-size']).toBe('12px');
    });

    it('base tokens define --strata-scrollbar-width as auto', () => {
      expect(baseTokens['--strata-scrollbar-width']).toBe('auto');
    });

    it('standard density does not override --strata-scrollbar-size', () => {
      const standardTokens = extractDensityTokens(densityCss, 'standard');
      expect(standardTokens['--strata-scrollbar-size']).toBeUndefined();
    });

    it('standard density does not override --strata-scrollbar-width', () => {
      const standardTokens = extractDensityTokens(densityCss, 'standard');
      expect(standardTokens['--strata-scrollbar-width']).toBeUndefined();
    });
  });

  describe('comfortable density', () => {
    const tokens = extractDensityTokens(densityCss, 'comfortable');

    it('sets --strata-scrollbar-size to 14px', () => {
      expect(tokens['--strata-scrollbar-size']).toBe('14px');
    });

    it('sets --strata-scrollbar-width to auto', () => {
      expect(tokens['--strata-scrollbar-width']).toBe('auto');
    });
  });

  describe('scrollbar size ordering', () => {
    const compactTokens = extractDensityTokens(densityCss, 'compact');
    const comfortableTokens = extractDensityTokens(densityCss, 'comfortable');

    it('compact scrollbar-size < standard scrollbar-size < comfortable scrollbar-size', () => {
      const compactSize = parseInt(compactTokens['--strata-scrollbar-size'], 10);
      const standardSize = parseInt(baseTokens['--strata-scrollbar-size'], 10);
      const comfortableSize = parseInt(comfortableTokens['--strata-scrollbar-size'], 10);

      expect(compactSize).toBeLessThan(standardSize);
      expect(standardSize).toBeLessThan(comfortableSize);
    });
  });
});
