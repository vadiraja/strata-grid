import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePrintMode } from './use-print-mode';

/**
 * Helper to mock window.matchMedia for testing the usePrintMode hook.
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

describe('usePrintMode', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('returns true when matchMedia("print") matches', () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => usePrintMode());

    expect(result.current).toBe(true);
  });

  it('updates to false when matchMedia fires a change event (print → not print)', () => {
    const { fire } = mockMatchMedia(true);

    const { result } = renderHook(() => usePrintMode());
    expect(result.current).toBe(true);

    act(() => {
      fire(false);
    });

    expect(result.current).toBe(false);
  });

  it('updates to true when matchMedia fires a change event (not print → print)', () => {
    const { fire } = mockMatchMedia(false);

    const { result } = renderHook(() => usePrintMode());
    expect(result.current).toBe(false);

    act(() => {
      fire(true);
    });

    expect(result.current).toBe(true);
  });

  // Note: Testing true SSR (window undefined) is difficult in JSDOM since window
  // is always defined. This test documents the expected behavior.
  it('SSR: returns false as default when window is undefined', () => {
    // In JSDOM, window is always defined, so we simulate by having matchMedia
    // return matches=false (which is the SSR fallback behavior).
    // The actual SSR guard (typeof window === 'undefined') returns false.
    mockMatchMedia(false);

    const { result } = renderHook(() => usePrintMode());
    expect(result.current).toBe(false);
  });

  it('cleans up the event listener on unmount', () => {
    const { listeners } = mockMatchMedia(false);

    const { unmount } = renderHook(() => usePrintMode());
    expect(listeners.length).toBe(1);

    unmount();
    expect(listeners.length).toBe(0);
  });
});
