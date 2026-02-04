/**
 * Tests for core module exports.
 * @module lib/core/index.test
 */

import { describe, it, expect } from 'vitest';
import { cn, logger, env, validateEnv, monitoring } from './index';

describe('lib/core exports', () => {
  it('exports cn utility', () => {
    expect(typeof cn).toBe('function');
    expect(cn('a', 'b')).toBe('a b');
  });

  it('exports logger', () => {
    expect(logger).toHaveProperty('debug');
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('error');
  });

  it('exports env configuration', () => {
    expect(env).toBeDefined();
    expect(typeof env).toBe('object');
  });

  it('exports validateEnv function', () => {
    expect(typeof validateEnv).toBe('function');
  });

  it('exports monitoring service', () => {
    expect(monitoring).toHaveProperty('captureException');
    expect(monitoring).toHaveProperty('captureMessage');
    expect(monitoring).toHaveProperty('setUser');
    expect(monitoring).toHaveProperty('clearUser');
    expect(monitoring).toHaveProperty('addBreadcrumb');
    expect(monitoring).toHaveProperty('startTransaction');
  });
});
