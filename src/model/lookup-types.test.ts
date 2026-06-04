import type { LookupConfig } from './types';
describe('LookupConfig', () => {
  it('accepts a minimal config', () => {
    const cfg: LookupConfig<{ id: string }> = { search: async () => [] };
    expect(typeof cfg.search).toBe('function');
  });
});
