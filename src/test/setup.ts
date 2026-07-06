/**
 * Test setup file for React component tests.
 * @module test/setup
 */

import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Ensure React Testing Library unmounts and clears the DOM after each test,
// even when an assertion throws or the test times out mid-render. Without
// this, leftover trees from a previous test cause "multiple elements found"
// errors and slow interleaved failures in subsequent tests.
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia for tests that use responsive hooks
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
    dispatchEvent: () => {},
  }),
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock;

// Mock IntersectionObserver
class IntersectionObserverMock {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.IntersectionObserver =
  IntersectionObserverMock as unknown as typeof IntersectionObserver;
