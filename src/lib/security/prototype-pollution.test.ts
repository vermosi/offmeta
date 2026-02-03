/**
 * Prototype Pollution Prevention Tests
 *
 * Tests for preventing prototype pollution attacks through malicious
 * object properties like __proto__, constructor, and prototype.
 */

import { describe, it, expect } from 'vitest';
import {
  containsPrototypePollution,
  sanitizeObjectKeys,
  safeJsonParse,
  PROTOTYPE_POLLUTION_PATTERNS,
} from './index';

describe('Prototype Pollution Prevention', () => {
  describe('Pattern Detection', () => {
    it('detects __proto__ in query strings', () => {
      const maliciousQuery = 't:creature __proto__:polluted';

      expect(containsPrototypePollution(maliciousQuery)).toBe(true);
    });

    it('detects constructor.constructor pattern', () => {
      const maliciousQuery = 'constructor.constructor("return this")()';

      expect(containsPrototypePollution(maliciousQuery)).toBe(true);
    });

    it('detects prototype access', () => {
      const maliciousQuery = 'Object.prototype.polluted = true';

      expect(containsPrototypePollution(maliciousQuery)).toBe(true);
    });

    it('allows normal queries without prototype patterns', () => {
      const normalQuery = 't:creature c:green';

      expect(containsPrototypePollution(normalQuery)).toBe(false);
    });

    it('detects case variations of __proto__', () => {
      expect(containsPrototypePollution('__PROTO__:value')).toBe(true);
      expect(containsPrototypePollution('__Proto__:value')).toBe(true);
    });

    it('detects URL-encoded __proto__', () => {
      const encoded = '__%70%72%6f%74%6f%5f%5f'; // __proto__

      // Note: This should be decoded before checking
      expect(containsPrototypePollution(decodeURIComponent(encoded))).toBe(true);
    });
  });

  describe('Object Key Sanitization', () => {
    it('removes __proto__ from object keys', () => {
      const maliciousObj = {
        name: 'test',
        __proto__: { polluted: true },
        safe: 'value',
      };

      const sanitized = sanitizeObjectKeys(maliciousObj);

      expect(sanitized).not.toHaveProperty('__proto__');
      expect(sanitized).toHaveProperty('name', 'test');
      expect(sanitized).toHaveProperty('safe', 'value');
    });

    it('removes constructor from object keys', () => {
      const maliciousObj = {
        constructor: { prototype: { polluted: true } },
        name: 'test',
      };

      const sanitized = sanitizeObjectKeys(maliciousObj);

      expect(sanitized).not.toHaveProperty('constructor');
      expect(sanitized).toHaveProperty('name', 'test');
    });

    it('removes prototype from object keys', () => {
      const maliciousObj = {
        prototype: { polluted: true },
        name: 'test',
      };

      const sanitized = sanitizeObjectKeys(maliciousObj);

      expect(sanitized).not.toHaveProperty('prototype');
    });

    it('handles nested objects', () => {
      const maliciousObj = {
        outer: {
          __proto__: { polluted: true },
          inner: {
            constructor: { bad: true },
            safe: 'value',
          },
        },
      };

      const sanitized = sanitizeObjectKeys(maliciousObj);

      expect(sanitized.outer).not.toHaveProperty('__proto__');
      expect(sanitized.outer.inner).not.toHaveProperty('constructor');
      expect(sanitized.outer.inner).toHaveProperty('safe', 'value');
    });

    it('handles arrays correctly', () => {
      const objWithArray = {
        items: [{ __proto__: 'bad' }, { safe: 'value' }],
      };

      const sanitized = sanitizeObjectKeys(objWithArray);

      expect(sanitized.items[0]).not.toHaveProperty('__proto__');
      expect(sanitized.items[1]).toHaveProperty('safe', 'value');
    });

    it('returns primitives unchanged', () => {
      expect(sanitizeObjectKeys('string')).toBe('string');
      expect(sanitizeObjectKeys(123)).toBe(123);
      expect(sanitizeObjectKeys(null)).toBe(null);
      expect(sanitizeObjectKeys(undefined)).toBe(undefined);
    });
  });

  describe('Safe JSON Parsing', () => {
    it('parses normal JSON safely', () => {
      const json = '{"name": "test", "value": 123}';

      const result = safeJsonParse(json);

      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('removes __proto__ from parsed JSON', () => {
      const json = '{"name": "test", "__proto__": {"polluted": true}}';

      const result = safeJsonParse(json);

      expect(result).not.toHaveProperty('__proto__');
      expect(result).toHaveProperty('name', 'test');
    });

    it('removes constructor from parsed JSON', () => {
      const json = '{"constructor": {"prototype": {}}}';

      const result = safeJsonParse(json);

      expect(result).not.toHaveProperty('constructor');
    });

    it('handles invalid JSON gracefully', () => {
      const invalid = 'not valid json';

      const result = safeJsonParse(invalid);

      expect(result).toBeNull();
    });

    it('prevents prototype chain pollution', () => {
      const originalProto = Object.prototype.toString;
      const json = '{"__proto__": {"polluted": "yes"}}';

      safeJsonParse(json);

      // Verify global prototype was not polluted
      expect(Object.prototype.toString).toBe(originalProto);
      expect(({} as unknown as { polluted?: string }).polluted).toBeUndefined();
    });
  });

  describe('Pattern Constants', () => {
    it('includes all dangerous patterns', () => {
      expect(PROTOTYPE_POLLUTION_PATTERNS).toContain('__proto__');
      expect(PROTOTYPE_POLLUTION_PATTERNS).toContain('constructor');
      expect(PROTOTYPE_POLLUTION_PATTERNS).toContain('prototype');
    });

    it('patterns array is frozen', () => {
      expect(() => {
        (PROTOTYPE_POLLUTION_PATTERNS as string[]).push('new_pattern');
      }).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles deeply nested prototype pollution', () => {
      const deep = {
        a: {
          b: {
            c: {
              d: {
                __proto__: { polluted: true },
              },
            },
          },
        },
      };

      const sanitized = sanitizeObjectKeys(deep);

      expect(sanitized.a.b.c.d).not.toHaveProperty('__proto__');
    });

    it('handles mixed arrays and objects', () => {
      const mixed = {
        items: [
          { __proto__: 'bad' },
          [{ constructor: 'bad' }],
          'safe string',
        ],
      };

      const sanitized = sanitizeObjectKeys(mixed);

      expect(sanitized.items[0]).not.toHaveProperty('__proto__');
      expect((sanitized.items[1] as unknown[])[0]).not.toHaveProperty('constructor');
      expect(sanitized.items[2]).toBe('safe string');
    });

    it('handles query parameters with prototype patterns', () => {
      const queries = [
        '__proto__[polluted]=true',
        'constructor[prototype][polluted]=true',
        '__proto__.polluted=true',
      ];

      for (const query of queries) {
        expect(containsPrototypePollution(query)).toBe(true);
      }
    });
  });
});
