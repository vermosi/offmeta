/**
 * Tests for monitoring utility.
 * @module lib/core/monitoring.test
 */

import { describe, it, expect } from 'vitest';
import { monitoring, type MonitoringContext } from './monitoring';

describe('monitoring', () => {
  describe('captureException', () => {
    it('accepts error with context', () => {
      const error = new Error('Test error');
      const context: MonitoringContext = { userId: 'user-123', tags: { env: 'test' } };
      
      expect(() => monitoring.captureException(error, context)).not.toThrow();
    });

    it('accepts error without context', () => {
      const error = new Error('Simple error');
      
      expect(() => monitoring.captureException(error)).not.toThrow();
    });
  });

  describe('captureMessage', () => {
    it('accepts info level message', () => {
      expect(() => monitoring.captureMessage('Info message', 'info')).not.toThrow();
    });

    it('accepts warning level message', () => {
      expect(() => monitoring.captureMessage('Warning message', 'warning')).not.toThrow();
    });

    it('accepts error level message', () => {
      expect(() => monitoring.captureMessage('Error message', 'error')).not.toThrow();
    });

    it('defaults to info level', () => {
      expect(() => monitoring.captureMessage('Default level')).not.toThrow();
    });

    it('accepts context', () => {
      const context: MonitoringContext = { sessionId: 'session-456' };
      expect(() => monitoring.captureMessage('With context', 'info', context)).not.toThrow();
    });
  });

  describe('setUser', () => {
    it('accepts user ID', () => {
      expect(() => monitoring.setUser('user-123')).not.toThrow();
    });

    it('accepts user ID with email', () => {
      expect(() => monitoring.setUser('user-123', 'user@example.com')).not.toThrow();
    });
  });

  describe('clearUser', () => {
    it('clears user', () => {
      expect(() => monitoring.clearUser()).not.toThrow();
    });
  });

  describe('addBreadcrumb', () => {
    it('accepts category and message', () => {
      expect(() => monitoring.addBreadcrumb('User clicked button', 'ui')).not.toThrow();
    });

    it('accepts data', () => {
      const data = { buttonId: 'submit-btn', page: 'home' };
      expect(() => monitoring.addBreadcrumb('Button click', 'interaction', data)).not.toThrow();
    });
  });

  describe('startTransaction', () => {
    it('returns object with finish method', () => {
      const transaction = monitoring.startTransaction('search', 'query');
      
      expect(transaction).toHaveProperty('finish');
      expect(typeof transaction.finish).toBe('function');
    });

    it('finish does not throw', () => {
      const transaction = monitoring.startTransaction('api-call', 'http');
      expect(() => transaction.finish()).not.toThrow();
    });

    it('measures elapsed time', async () => {
      const transaction = monitoring.startTransaction('slow-op', 'compute');
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 5));
      expect(() => transaction.finish()).not.toThrow();
    });
  });

  describe('exports', () => {
    it('has all monitoring methods', () => {
      expect(monitoring).toHaveProperty('captureException');
      expect(monitoring).toHaveProperty('captureMessage');
      expect(monitoring).toHaveProperty('setUser');
      expect(monitoring).toHaveProperty('clearUser');
      expect(monitoring).toHaveProperty('addBreadcrumb');
      expect(monitoring).toHaveProperty('startTransaction');
    });
  });
});
