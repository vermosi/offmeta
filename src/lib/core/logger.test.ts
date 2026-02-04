/**
 * Tests for logger utility.
 * @module lib/core/logger.test
 */

import { describe, it, expect } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  describe('debug', () => {
    it('is a function', () => {
      expect(typeof logger.debug).toBe('function');
    });

    it('accepts multiple arguments without throwing', () => {
      expect(() => logger.debug('test', { data: 1 }, [1, 2, 3])).not.toThrow();
    });
  });

  describe('info', () => {
    it('is a function', () => {
      expect(typeof logger.info).toBe('function');
    });

    it('accepts multiple arguments without throwing', () => {
      expect(() => logger.info('test info', 123)).not.toThrow();
    });
  });

  describe('warn', () => {
    it('is a function', () => {
      expect(typeof logger.warn).toBe('function');
    });

    it('accepts multiple arguments without throwing', () => {
      expect(() => logger.warn('warning', { detail: 'test' })).not.toThrow();
    });
  });

  describe('error', () => {
    it('is a function', () => {
      expect(typeof logger.error).toBe('function');
    });

    it('accepts multiple arguments without throwing', () => {
      const err = new Error('test error');
      expect(() => logger.error('failed:', err)).not.toThrow();
    });
  });

  describe('exports', () => {
    it('has all four log methods', () => {
      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
    });
  });
});
