import { describe, it, expect } from 'vitest';
import { resolveFilterConfig } from './resolve-filter-config';
import type { ColumnFilterConfig } from './types';

describe('resolveFilterConfig', () => {
  describe('string shortcuts', () => {
    it("resolves 'text' to a text config with default operators", () => {
      const r = resolveFilterConfig('text');
      expect(r.type).toBe('text');
      if (r.type === 'text') {
        expect(r.operators).toContain('contains');
        expect(r.operators).toContain('equals');
        expect(r.operators).toContain('isEmpty');
      }
    });

    it("resolves 'number' to a number config with default operators", () => {
      const r = resolveFilterConfig('number');
      expect(r.type).toBe('number');
      if (r.type === 'number') {
        expect(r.operators).toContain('greaterThan');
        expect(r.operators).toContain('between');
        expect(r.operators).not.toContain('contains');
      }
    });
  });

  describe('object form — text/number', () => {
    it('applies default operators when omitted', () => {
      const r = resolveFilterConfig({ type: 'text' });
      expect(r.type).toBe('text');
      if (r.type === 'text') {
        expect(r.operators.length).toBeGreaterThan(0);
        expect(r.operators).toContain('contains');
      }
    });

    it('honors user-supplied operators override', () => {
      const r = resolveFilterConfig({
        type: 'text',
        operators: ['equals', 'notEquals'],
      });
      if (r.type === 'text') {
        expect(r.operators).toEqual(['equals', 'notEquals']);
      }
    });
  });

  describe('select', () => {
    const options = [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ];

    it("single-select defaults to ['equals', 'notEquals']", () => {
      const r = resolveFilterConfig({ type: 'select', options });
      if (r.type === 'select') {
        expect(r.multi).toBe(false);
        expect(r.operators).toEqual(['equals', 'notEquals']);
        expect(r.options).toEqual(options);
      }
    });

    it("multi-select defaults to ['in', 'notIn']", () => {
      const r = resolveFilterConfig({ type: 'select', options, multi: true });
      if (r.type === 'select') {
        expect(r.multi).toBe(true);
        expect(r.operators).toEqual(['in', 'notIn']);
      }
    });

    it('honors user-supplied operators override for select', () => {
      const r = resolveFilterConfig({
        type: 'select',
        options,
        operators: ['equals'],
      });
      if (r.type === 'select') {
        expect(r.operators).toEqual(['equals']);
      }
    });
  });

  describe('boolean', () => {
    it("resolves to a boolean config with ['equals'] operator", () => {
      const r = resolveFilterConfig({ type: 'boolean' });
      expect(r.type).toBe('boolean');
      if (r.type === 'boolean') {
        expect(r.operators).toEqual(['equals']);
      }
    });
  });

  describe('date', () => {
    it('single-date defaults include equals + comparators', () => {
      const r = resolveFilterConfig({ type: 'date' });
      if (r.type === 'date') {
        expect(r.range).toBe(false);
        expect(r.operators).toContain('equals');
        expect(r.operators).toContain('greaterThan');
        expect(r.operators).not.toContain('between');
      }
    });

    it("range-date defaults to ['between']", () => {
      const r = resolveFilterConfig({ type: 'date', range: true });
      if (r.type === 'date') {
        expect(r.range).toBe(true);
        expect(r.operators).toEqual(['between']);
      }
    });

    it('honors user-supplied operators override for date', () => {
      const r = resolveFilterConfig({
        type: 'date',
        operators: ['equals'],
      });
      if (r.type === 'date') {
        expect(r.operators).toEqual(['equals']);
      }
    });
  });

  it('resolves all valid ColumnFilterConfig shapes without throwing', () => {
    const configs: ColumnFilterConfig[] = [
      'text',
      'number',
      { type: 'text' },
      { type: 'number' },
      { type: 'select', options: [{ label: 'A', value: 'a' }] },
      { type: 'select', options: [{ label: 'A', value: 'a' }], multi: true },
      { type: 'boolean' },
      { type: 'date' },
      { type: 'date', range: true },
    ];
    for (const c of configs) {
      expect(() => resolveFilterConfig(c)).not.toThrow();
    }
  });
});
