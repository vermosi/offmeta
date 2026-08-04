import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { classifyTraffic } from './traffic';

describe('classifyTraffic', () => {
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
    });
  });

  it('treats localhost as internal and suppressed', () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: { hostname: 'localhost' },
      },
      configurable: true,
    });

    expect(classifyTraffic()).toEqual({
      isInternal: true,
      shouldSuppressInsert: true,
    });
  });

  it('treats preview hosts as internal and suppressed', () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: { hostname: 'foo-preview--bar.lovable.app' },
      },
      configurable: true,
    });

    expect(classifyTraffic()).toEqual({
      isInternal: true,
      shouldSuppressInsert: true,
    });
  });

  it('treats opted-in production traffic as internal but not suppressed', () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: { hostname: 'offmeta.app' },
      },
      configurable: true,
    });
    localStorage.setItem('offmeta_internal', 'true');

    expect(classifyTraffic()).toEqual({
      isInternal: true,
      shouldSuppressInsert: false,
    });
  });

  it('treats normal production traffic as external', () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: { hostname: 'offmeta.app' },
      },
      configurable: true,
    });

    expect(classifyTraffic()).toEqual({
      isInternal: false,
      shouldSuppressInsert: false,
    });
  });
});
