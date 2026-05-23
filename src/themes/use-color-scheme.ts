import { useState, useEffect } from 'react';

const MEDIA_QUERY = '(prefers-color-scheme: dark)';

/**
 * Subscribes to the OS color scheme preference and returns the current scheme.
 *
 * SSR-safe: returns 'light' when `window` is undefined.
 */
export function useColorScheme(): 'light' | 'dark' {
  const [scheme, setScheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia(MEDIA_QUERY);

    const handleChange = (e: MediaQueryListEvent) => {
      setScheme(e.matches ? 'dark' : 'light');
    };

    // Sync state in case it changed between SSR and hydration
    setScheme(mql.matches ? 'dark' : 'light');

    mql.addEventListener('change', handleChange);
    return () => {
      mql.removeEventListener('change', handleChange);
    };
  }, []);

  return scheme;
}
