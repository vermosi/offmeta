/**
 * Error Information Leakage Prevention Tests
 *
 * Tests for error sanitization to prevent sensitive information from being
 * exposed to clients in error messages.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeErrorForClient, sanitizeStackTrace } from './index';

describe('Error Information Leakage Prevention', () => {
  describe('sanitizeErrorForClient', () => {
    it('removes file paths from error messages', () => {
      const error = new Error('Failed to read /home/user/app/src/lib/config.ts');

      const sanitized = sanitizeErrorForClient(error);

      expect(sanitized).not.toContain('/home/user/app');
      expect(sanitized).toContain('[PATH]');
    });

    it('removes Windows file paths', () => {
      const error = new Error('Failed to read C:\\Users\\admin\\project\\secret.ts');

      const sanitized = sanitizeErrorForClient(error);

      expect(sanitized).not.toContain('C:\\Users');
      expect(sanitized).toContain('[PATH]');
    });

    it('removes Bearer tokens from error messages', () => {
      const error = new Error(
        'Auth failed with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig',
      );

      const sanitized = sanitizeErrorForClient(error);

      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(sanitized).toContain('[TOKEN]');
    });

    it('removes API keys from error messages', () => {
      const error = new Error('Invalid API key: sk_live_abc123xyz789');

      const sanitized = sanitizeErrorForClient(error);

      expect(sanitized).not.toContain('sk_live_abc123xyz789');
      expect(sanitized).toContain('[REDACTED]');
    });

    it('removes database connection strings', () => {
      const error = new Error(
        'Connection failed: postgres://user:password@localhost:5432/db',
      );

      const sanitized = sanitizeErrorForClient(error);

      expect(sanitized).not.toContain('password');
      expect(sanitized).not.toContain('postgres://');
    });

    it('handles non-Error objects gracefully', () => {
      const sanitized = sanitizeErrorForClient('simple string error');

      expect(sanitized).toBe('An error occurred');
    });

    it('handles null/undefined gracefully', () => {
      expect(sanitizeErrorForClient(null)).toBe('An error occurred');
      expect(sanitizeErrorForClient(undefined)).toBe('An error occurred');
    });

    it('handles object errors', () => {
      const sanitized = sanitizeErrorForClient({ message: 'object error', code: 500 });

      expect(sanitized).toBe('An error occurred');
    });

    it('preserves safe error messages', () => {
      const error = new Error('Invalid query parameter');

      const sanitized = sanitizeErrorForClient(error);

      expect(sanitized).toBe('Invalid query parameter');
    });

    it('removes line and column numbers', () => {
      const error = new Error('Error at config.ts:42:15 - something went wrong');

      const sanitized = sanitizeErrorForClient(error);

      expect(sanitized).not.toMatch(/:\d+:\d+/);
    });

    it('removes environment variable values', () => {
      const error = new Error('OPENROUTER_API_KEY=abc123secret was invalid');

      const sanitized = sanitizeErrorForClient(error);

      expect(sanitized).not.toContain('abc123secret');
    });

    it('handles multiple sensitive patterns in one message', () => {
      const error = new Error(
        'Auth Bearer abc123 failed for /home/user/app at line:10:5',
      );

      const sanitized = sanitizeErrorForClient(error);

      expect(sanitized).not.toContain('abc123');
      expect(sanitized).not.toContain('/home/user');
      expect(sanitized).not.toMatch(/:\d+:\d+/);
    });
  });

  describe('sanitizeStackTrace', () => {
    it('removes stack trace frames', () => {
      const stack = `Error: Something failed
        at Function.doSomething (/app/src/lib/handler.ts:42:15)
        at processRequest (/app/src/index.ts:100:10)
        at Object.<anonymous> (/app/node_modules/express/lib/router.js:50:5)`;

      const sanitized = sanitizeStackTrace(stack);

      expect(sanitized).not.toContain('/app/src/lib/handler.ts');
      expect(sanitized).not.toContain(':42:15');
      expect(sanitized).toContain('[STACK]');
    });

    it('preserves the error message line', () => {
      const stack = `Error: Invalid input provided
        at validate (/app/src/validator.ts:10:5)`;

      const sanitized = sanitizeStackTrace(stack);

      expect(sanitized).toContain('Error: Invalid input provided');
    });

    it('handles empty stack trace', () => {
      const sanitized = sanitizeStackTrace('');

      expect(sanitized).toBe('');
    });

    it('handles stack with only message', () => {
      const sanitized = sanitizeStackTrace('Error: Just a message');

      expect(sanitized).toBe('Error: Just a message');
    });
  });

  describe('Edge Cases', () => {
    it('handles very long error messages', () => {
      const longPath = '/home/user/' + 'a'.repeat(1000) + '/file.ts';
      const error = new Error(`Error at ${longPath}`);

      const sanitized = sanitizeErrorForClient(error);

      expect(sanitized.length).toBeLessThan(500);
      expect(sanitized).not.toContain('aaaa');
    });

    it('handles unicode in error messages', () => {
      const error = new Error('Error: файл не найден /home/user/файл.ts');

      const sanitized = sanitizeErrorForClient(error);

      expect(sanitized).not.toContain('/home/user');
    });

    it('handles newlines in error messages', () => {
      const error = new Error('Line 1\nPath: /secret/path\nLine 3');

      const sanitized = sanitizeErrorForClient(error);

      expect(sanitized).not.toContain('/secret/path');
    });

    it('handles JSON-like strings in error messages', () => {
      const error = new Error('{"path":"/home/user/app","key":"secret123"}');

      const sanitized = sanitizeErrorForClient(error);

      expect(sanitized).not.toContain('/home/user');
    });
  });
});
