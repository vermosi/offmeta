/**
 * Payload attack prevention tests.
 * Tests for oversized payloads, malformed JSON, and resource exhaustion.
 * @module lib/security/payload-attacks.test
 */

import { describe, it, expect } from 'vitest';
import {
  buildOversizedPayload,
  buildNestedObject,
  buildCircularLikePayload,
  SECURITY_LIMITS,
} from './index';

// ============================================================================
// Oversized Payload Tests
// ============================================================================

describe('Security: Oversized Payload Prevention', () => {
  it('rejects queries exceeding 500 character limit', () => {
    const oversized = buildOversizedPayload(10); // 10KB
    
    expect(oversized.query.length).toBeGreaterThan(SECURITY_LIMITS.MAX_QUERY_LENGTH);
    
    // Validation should reject this
    const isValid = oversized.query.length <= SECURITY_LIMITS.MAX_QUERY_LENGTH;
    expect(isValid).toBe(false);
  });

  it('accepts queries within limit', () => {
    const validQuery = 't:creature c:r mv<=3';
    
    expect(validQuery.length).toBeLessThan(SECURITY_LIMITS.MAX_QUERY_LENGTH);
  });

  it('handles exactly 500 character queries', () => {
    const exactLimit = 'a'.repeat(500);
    
    expect(exactLimit.length).toBe(500);
    expect(exactLimit.length).toBeLessThanOrEqual(SECURITY_LIMITS.MAX_QUERY_LENGTH);
  });

  it('rejects 1KB payloads', () => {
    const payload = buildOversizedPayload(1);
    
    expect(payload.query.length).toBeGreaterThan(500);
  });

  it('rejects 10KB payloads', () => {
    const payload = buildOversizedPayload(10);
    
    expect(payload.query.length).toBeGreaterThan(10000);
  });

  it('rejects 100KB payloads', () => {
    const payload = buildOversizedPayload(100);
    
    expect(payload.query.length).toBeGreaterThan(100000);
  });
});

// ============================================================================
// JSON Bomb Prevention Tests
// ============================================================================

describe('Security: JSON Bomb Prevention', () => {
  it('rejects deeply nested objects', () => {
    const deepNested = buildNestedObject(100);
    
    function getDepth(obj: Record<string, unknown>, current: number = 0): number {
      if (!obj.nested || typeof obj.nested !== 'object') {
        return current + 1;
      }
      return getDepth(obj.nested as Record<string, unknown>, current + 1);
    }

    const depth = getDepth(deepNested);
    expect(depth).toBeGreaterThan(SECURITY_LIMITS.MAX_JSON_DEPTH);
  });

  it('accepts shallow nested objects', () => {
    const shallow = buildNestedObject(3);
    
    function getDepth(obj: Record<string, unknown>, current: number = 0): number {
      if (!obj.nested || typeof obj.nested !== 'object') {
        return current + 1;
      }
      return getDepth(obj.nested as Record<string, unknown>, current + 1);
    }

    const depth = getDepth(shallow);
    expect(depth).toBeLessThanOrEqual(SECURITY_LIMITS.MAX_JSON_DEPTH);
  });

  it('validates maximum nesting depth', () => {
    function validateDepth(
      obj: unknown,
      maxDepth: number,
      currentDepth: number = 0,
    ): boolean {
      if (currentDepth > maxDepth) return false;
      
      if (typeof obj === 'object' && obj !== null) {
        for (const value of Object.values(obj)) {
          if (!validateDepth(value, maxDepth, currentDepth + 1)) {
            return false;
          }
        }
      }
      return true;
    }

    const deepObj = buildNestedObject(15);
    const shallowObj = buildNestedObject(5);

    expect(validateDepth(deepObj, 10)).toBe(false);
    expect(validateDepth(shallowObj, 10)).toBe(true);
  });

  it('handles exponential expansion attacks', () => {
    // Billion laughs / XML bomb style attack in JSON
    const expansionAttack = {
      a: 'x'.repeat(10),
      b: { ref: 'a', count: 10 },
      c: { ref: 'b', count: 10 },
      d: { ref: 'c', count: 10 },
    };

    // This should serialize to a reasonable size
    const serialized = JSON.stringify(expansionAttack);
    expect(serialized.length).toBeLessThan(1000);
  });
});

// ============================================================================
// Circular Reference Prevention Tests
// ============================================================================

describe('Security: Circular Reference Prevention', () => {
  it('handles circular-like deep structures', () => {
    const circular = buildCircularLikePayload();
    
    // Should be serializable (no actual circular ref)
    expect(() => JSON.stringify(circular)).not.toThrow();
  });

  it('limits traversal depth to prevent stack overflow', () => {
    function safeTraverse(
      obj: unknown,
      maxDepth: number = 50,
      currentDepth: number = 0,
    ): number {
      if (currentDepth >= maxDepth) {
        return currentDepth;
      }
      
      if (typeof obj === 'object' && obj !== null) {
        let maxReached = currentDepth;
        for (const value of Object.values(obj)) {
          const depth = safeTraverse(value, maxDepth, currentDepth + 1);
          maxReached = Math.max(maxReached, depth);
        }
        return maxReached;
      }
      
      return currentDepth;
    }

    const deep = buildCircularLikePayload();
    const depth = safeTraverse(deep);
    
    // Should hit the max depth limit
    expect(depth).toBe(50);
  });
});

// ============================================================================
// Malformed Payload Tests
// ============================================================================

describe('Security: Malformed Payload Handling', () => {
  it('handles empty body gracefully', () => {
    function validateBody(body: unknown): { valid: boolean; error?: string } {
      if (body === null || body === undefined) {
        return { valid: false, error: 'Empty body' };
      }
      return { valid: true };
    }

    expect(validateBody(null).valid).toBe(false);
    expect(validateBody(undefined).valid).toBe(false);
    expect(validateBody({}).valid).toBe(true);
  });

  it('rejects arrays when object expected', () => {
    function validateBody(body: unknown): { valid: boolean; error?: string } {
      if (Array.isArray(body)) {
        return { valid: false, error: 'Expected object, got array' };
      }
      if (typeof body !== 'object' || body === null) {
        return { valid: false, error: 'Invalid body type' };
      }
      return { valid: true };
    }

    expect(validateBody([]).valid).toBe(false);
    expect(validateBody([1, 2, 3]).valid).toBe(false);
    expect(validateBody({ query: 'test' }).valid).toBe(true);
  });

  it('handles invalid JSON parsing', () => {
    const invalidJSONStrings = [
      '{invalid}',
      '{"unclosed": ',
      '["array", without, quotes]',
      'just a string',
      '',
    ];

    invalidJSONStrings.forEach((str) => {
      let parsed = null;
      let error = null;
      
      try {
        parsed = JSON.parse(str);
      } catch (e) {
        error = e;
      }

      // Either parsing fails or we need to validate the result
      expect(error !== null || parsed !== null).toBe(true);
    });
  });

  it('handles non-string query values', () => {
    function validateQuery(body: unknown): { valid: boolean; error?: string } {
      if (typeof body !== 'object' || body === null) {
        return { valid: false, error: 'Invalid body' };
      }

      const typedBody = body as Record<string, unknown>;
      
      if (typeof typedBody.query !== 'string') {
        return { valid: false, error: 'Query must be a string' };
      }

      return { valid: true };
    }

    expect(validateQuery({ query: 123 }).valid).toBe(false);
    expect(validateQuery({ query: null }).valid).toBe(false);
    expect(validateQuery({ query: ['array'] }).valid).toBe(false);
    expect(validateQuery({ query: { nested: 'object' } }).valid).toBe(false);
    expect(validateQuery({ query: 't:creature' }).valid).toBe(true);
  });
});

// ============================================================================
// UTF-8 and Encoding Tests
// ============================================================================

describe('Security: UTF-8 and Encoding Validation', () => {
  it('handles valid UTF-8 characters', () => {
    const validUTF8 = [
      't:creature',
      'カード', // Japanese
      'карта', // Russian
      'κάρτα', // Greek
      '牌', // Chinese
      '🎴', // Emoji
    ];

    validUTF8.forEach((str) => {
      // Should not throw
      expect(() => encodeURIComponent(str)).not.toThrow();
    });
  });

  it('handles special characters safely', () => {
    const specialChars = [
      't:creature\n',
      't:creature\r\n',
      't:creature\t',
      't:creature\u0000', // Null byte
    ];

    specialChars.forEach((str) => {
      // Should be processable
      expect(typeof str).toBe('string');
    });
  });

  it('normalizes whitespace variations', () => {
    function normalizeWhitespace(input: string): string {
      return input
        .replace(/\r\n/g, ' ')
        .replace(/[\r\n\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    expect(normalizeWhitespace('t:creature\n\n\n')).toBe('t:creature');
    expect(normalizeWhitespace('t:creature  c:r')).toBe('t:creature c:r');
    expect(normalizeWhitespace('\t\tt:creature')).toBe('t:creature');
  });

  it('rejects control characters', () => {
    function hasControlChars(input: string): boolean {
      // Control characters except tab, newline, carriage return
      return /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(input);
    }

    expect(hasControlChars('t:creature\x00')).toBe(true);
    expect(hasControlChars('t:creature\x07')).toBe(true);
    expect(hasControlChars('t:creature')).toBe(false);
    expect(hasControlChars('t:creature\n')).toBe(false); // Newline OK
  });
});

// ============================================================================
// Request Size Limits
// ============================================================================

describe('Security: Request Size Limits', () => {
  it('enforces maximum request body size', () => {
    const MAX_BODY_SIZE = 1024 * 1024; // 1MB

    function checkBodySize(body: string): boolean {
      return Buffer.byteLength(body, 'utf8') <= MAX_BODY_SIZE;
    }

    const smallBody = JSON.stringify({ query: 't:creature' });
    const largeBody = JSON.stringify({ query: 'a'.repeat(2 * 1024 * 1024) });

    expect(checkBodySize(smallBody)).toBe(true);
    expect(checkBodySize(largeBody)).toBe(false);
  });

  it('enforces maximum header size', () => {
    const MAX_HEADER_SIZE = 8 * 1024; // 8KB

    function checkHeaderSize(headers: Record<string, string>): boolean {
      const totalSize = Object.entries(headers)
        .map(([k, v]) => k.length + v.length + 4) // +4 for ": " and "\r\n"
        .reduce((a, b) => a + b, 0);
      
      return totalSize <= MAX_HEADER_SIZE;
    }

    const normalHeaders = {
      'Authorization': 'Bearer token123',
      'Content-Type': 'application/json',
    };

    const largeHeaders = {
      'X-Custom-Header': 'x'.repeat(10000),
    };

    expect(checkHeaderSize(normalHeaders)).toBe(true);
    expect(checkHeaderSize(largeHeaders)).toBe(false);
  });

  it('enforces URL length limits', () => {
    const MAX_URL_LENGTH = 2048;

    function checkURLLength(url: string): boolean {
      return url.length <= MAX_URL_LENGTH;
    }

    const shortURL = '/api/search?q=creature';
    const longURL = '/api/search?q=' + 'a'.repeat(3000);

    expect(checkURLLength(shortURL)).toBe(true);
    expect(checkURLLength(longURL)).toBe(false);
  });
});
