import { useState, useEffect } from 'react';

const MEDIA_QUERY = 'print';

/**
 * Subscribes to the print media query and returns whether print mode is active.
 *
 * SSR-safe: returns `false` when `window` is undefined.
 */
export function usePrintMode(): boolean {
  const [printing, setPrinting] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(MEDIA_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia(MEDIA_QUERY);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrinting(e.matches);
    };

    // Sync state in case it changed between SSR and hydration
    setPrinting(mql.matches);

    mql.addEventListener('change', handleChange);
    return () => {
      mql.removeEventListener('change', handleChange);
    };
  }, []);

  return printing;
}
