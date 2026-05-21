import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// --- Virtualization test environment ---------------------------------------
// jsdom has no layout engine and no ResizeObserver. TanStack Virtual measures
// its scroll element with getBoundingClientRect and observes it with a
// ResizeObserver. Provide both so the row virtualizer renders rows in tests.

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

const TEST_VIEWPORT_WIDTH = 800;
const TEST_VIEWPORT_HEIGHT = 600;

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
