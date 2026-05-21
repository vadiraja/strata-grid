declare const process: { env: Record<string, string | undefined> };

import { devWarn } from './dev-warn';

describe('devWarn', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it('writes a prefixed warning outside production', () => {
    process.env.NODE_ENV = 'development';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    devWarn('something looks off');
    expect(warn).toHaveBeenCalledWith('[strata] something looks off');
  });

  it('is silent in production', () => {
    process.env.NODE_ENV = 'production';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    devWarn('something looks off');
    expect(warn).not.toHaveBeenCalled();
  });
});
