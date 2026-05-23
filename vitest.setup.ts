import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// --- matchMedia stub -------------------------------------------------------
// jsdom does not implement window.matchMedia. Provide a minimal stub so hooks
// like useColorScheme work in tests (defaults to light scheme).
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// --- Virtualization test environment ---------------------------------------
// jsdom has no layout engine and no ResizeObserver. TanStack Virtual measures
// its scroll element with offsetHeight/offsetWidth and observes it with a
// ResizeObserver. Provide both so the row virtualizer renders rows in tests.

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

const TEST_VIEWPORT_WIDTH = 800;
const TEST_VIEWPORT_HEIGHT = 600;

// TanStack Virtual reads offsetHeight / offsetWidth (not getBoundingClientRect)
// to determine how many rows fit in the visible area. jsdom always returns 0
// for these, so we stub them to a realistic viewport size.
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  get() { return TEST_VIEWPORT_HEIGHT; },
});

Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  configurable: true,
  get() { return TEST_VIEWPORT_WIDTH; },
});

Element.prototype.getBoundingClientRect = function getBoundingClientRect(): DOMRect {
  return {
    width: TEST_VIEWPORT_WIDTH,
    height: TEST_VIEWPORT_HEIGHT,
    top: 0,
    left: 0,
    right: TEST_VIEWPORT_WIDTH,
    bottom: TEST_VIEWPORT_HEIGHT,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
};
