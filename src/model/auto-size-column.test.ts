import { describe, expect, it, beforeEach } from 'vitest';
import { measureColumnWidth } from './auto-size-column';

function makeGridDom(widths: number[]): HTMLElement {
  const root = document.createElement('div');
  root.className = 'strata-grid';
  for (const w of widths) {
    const row = document.createElement('div');
    const cell = document.createElement('div');
    cell.className = 'strata-cell';
    cell.dataset.strataCellColumn = 'a';
    Object.defineProperty(cell, 'scrollWidth', { value: w, configurable: true });
    row.appendChild(cell);
    root.appendChild(row);
  }
  document.body.appendChild(root);
  return root;
}

describe('measureColumnWidth', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns the widest cell scrollWidth + padding', () => {
    const root = makeGridDom([40, 120, 80]);
    expect(measureColumnWidth(root, 'a', 16)).toBe(120 + 16);
  });

  it('returns minWidth when no cells found', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    expect(measureColumnWidth(root, 'missing', 16, 60)).toBe(60);
  });

  it('uses default padding (16) and default minWidth (40) when omitted', () => {
    const root = makeGridDom([10, 12]);
    // widest scrollWidth (12) + padding (16) = 28, less than default min 40 → 40
    expect(measureColumnWidth(root, 'a')).toBe(40);
  });

  it('returns max(scrollWidth + padding, minWidth) when scrollWidth + padding is larger', () => {
    const root = makeGridDom([200]);
    expect(measureColumnWidth(root, 'a', 16, 40)).toBe(216);
  });
});
