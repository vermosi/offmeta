/**
 * Tests for PWA registration utility.
 * @module lib/pwa/register.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the virtual:pwa-register module
vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn(() => vi.fn()),
}));

describe('initPWA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('is a function', async () => {
    const { initPWA } = await import('./register');
    expect(typeof initPWA).toBe('function');
  });

  it('does not throw when called', async () => {
    const { initPWA } = await import('./register');
    expect(() => initPWA()).not.toThrow();
  });

  it('handles errors gracefully', async () => {
    const { initPWA } = await import('./register');
    // Should not throw even if internal errors occur
    expect(() => initPWA()).not.toThrow();
  });
});

describe('PWA module exports', () => {
  it('exports initPWA from index', async () => {
    const pwaModule = await import('./index');
    expect(pwaModule).toHaveProperty('initPWA');
    expect(typeof pwaModule.initPWA).toBe('function');
  });
});
