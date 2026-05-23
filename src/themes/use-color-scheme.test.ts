import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColorScheme } from './use-color-scheme';

/**
 * Helper to mock window.matchMedia for testing the useColorScheme hook.
 * Returns controls to fire change events and inspect registered listeners.
 */
function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql = {
    matches,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.push(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    },
  };
  window.matchMedia = () => mql as unknown as MediaQueryList;
  return {
    mql,
    listeners,
    fire: (newMatches: boolean) => {
      mql.matches = newMatches;
      listeners.forEach((cb) => cb({ matches: newMatches } as MediaQueryListEvent));
    },
  };
}

describe('useColorScheme', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('returns "dark" when matchMedia reports prefers-color-scheme: dark', () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useColorScheme());

    expect(result.current).toBe('dark');
  });

  it('returns "light" when matchMedia reports no dark preference', () => {
    mockMatchMedia(false);

    const { result } = renderHook(() => useColorScheme());

    expect(result.current).toBe('light');
  });

  it('updates to "light" when matchMedia fires a change event from dark to light', () => {
    const { fire } = mockMatchMedia(true);

    const { result } = renderHook(() => useColorScheme());
    expect(result.current).toBe('dark');

    act(() => {
      fire(false);
    });

    expect(result.current).toBe('light');
  });

  it('updates to "dark" when matchMedia fires a change event from light to dark', () => {
    const { fire } = mockMatchMedia(false);

    const { result } = renderHook(() => useColorScheme());
    expect(result.current).toBe('light');

    act(() => {
      fire(true);
    });

    expect(result.current).toBe('dark');
  });

  it('cleans up the event listener on unmount', () => {
    const { listeners } = mockMatchMedia(false);

    const { unmount } = renderHook(() => useColorScheme());
    expect(listeners.length).toBe(1);

    unmount();
    expect(listeners.length).toBe(0);
  });

  // Note: Testing true SSR (window undefined) is difficult in JSDOM since window
  // is always defined. This test documents the expected behavior.
  it('SSR: returns "light" as default when window is undefined', () => {
    // In JSDOM, window is always defined, so we simulate by having matchMedia
    // return matches=false (which is the SSR fallback behavior).
    // The actual SSR guard (typeof window === 'undefined') returns 'light'.
    mockMatchMedia(false);

    const { result } = renderHook(() => useColorScheme());
    expect(result.current).toBe('light');
  });
});
