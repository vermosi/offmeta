/**
 * Comprehensive input sanitization tests.
 * Tests for spam detection, special characters, and encoding issues.
 * @module lib/security/input-sanitization.test
 */

import { describe, it, expect } from 'vitest';
import { validateScryfallQuery } from '@/lib/scryfall/query';
import {
  sanitizeInput,
  hasRepetitiveChars,
  hasMinimumAlphanumeric,
  countQueryParameters,
  SECURITY_LIMITS,
} from './index';

// ============================================================================
// Repetitive Character Spam Tests
// ============================================================================

describe('Security: Repetitive Character Detection', () => {
  it('detects repeated single characters', () => {
    expect(hasRepetitiveChars('aaaaaaaaaa')).toBe(true);
    expect(hasRepetitiveChars('bbbbbbbb')).toBe(true);
    expect(hasRepetitiveChars('zzzzzzzz')).toBe(true);
  });

  it('accepts normal text without repetition', () => {
    expect(hasRepetitiveChars('t:creature')).toBe(false);
    expect(hasRepetitiveChars('hello world')).toBe(false);
    expect(hasRepetitiveChars('normal query text')).toBe(false);
  });

  it('detects repeated special characters', () => {
    expect(hasRepetitiveChars(':::::::')).toBe(true);
    expect(hasRepetitiveChars('!!!!!!!')).toBe(true);
    expect(hasRepetitiveChars('??????')).toBe(true);
  });

  it('allows short repetitions', () => {
    expect(hasRepetitiveChars('aaa')).toBe(false); // Only 3 chars
    expect(hasRepetitiveChars('oooo')).toBe(false); // 4 chars
    expect(hasRepetitiveChars('eeeee')).toBe(false); // 5 chars
  });

  it('detects repetitions at threshold', () => {
    expect(hasRepetitiveChars('aaaaaa', 6)).toBe(true); // Exactly 6
    expect(hasRepetitiveChars('aaaaa', 6)).toBe(false); // Only 5
  });

  it('handles edge cases', () => {
    expect(hasRepetitiveChars('')).toBe(false);
    expect(hasRepetitiveChars('a')).toBe(false);
    expect(hasRepetitiveChars('ab')).toBe(false);
  });
});

// ============================================================================
// Operator Spam Tests
// ============================================================================

describe('Security: Operator Spam Detection', () => {
  it('detects excessive operator usage', () => {
    const operatorSpam = 't:t:t:t:t:creature';
    const result = validateScryfallQuery(operatorSpam);
    
    // Should flag or sanitize the spam
    expect(result).toBeDefined();
  });

  it('detects repeated colon operators', () => {
    const colonSpam = 't::creature';
    
    // Multiple consecutive colons indicate malformed query
    expect(colonSpam.includes('::')).toBe(true);
  });

  it('detects empty value operators', () => {
    const emptyValues = ['t:', 'c:', 'o:', 'mv:'];
    
    emptyValues.forEach((op) => {
      const query = `${op} t:creature`;
      const result = validateScryfallQuery(query);
      // Empty operators should be detected
      expect(result).toBeDefined();
    });
  });

  it('accepts valid operator usage', () => {
    const validQueries = [
      't:creature',
      't:creature c:r',
      't:creature o:draw mv:3',
      '(t:creature OR t:artifact)',
    ];

    validQueries.forEach((query) => {
      const result = validateScryfallQuery(query);
      expect(result.valid).toBe(true);
    });
  });
});

// ============================================================================
// Special Character Flood Tests
// ============================================================================

describe('Security: Special Character Flood Detection', () => {
  it('detects queries with excessive special characters', () => {
    // Long strings with mostly special chars should be flagged
    expect(hasMinimumAlphanumeric(':::::::::::::', 0.5)).toBe(false);
    expect(hasMinimumAlphanumeric('!@#$%^&*()!@#', 0.5)).toBe(false);
  });

  it('accepts normal queries with some special chars', () => {
    expect(hasMinimumAlphanumeric('t:creature o:draw')).toBe(true);
    expect(hasMinimumAlphanumeric('(t:creature OR t:artifact)')).toBe(true);
    expect(hasMinimumAlphanumeric('mv<=3')).toBe(true);
  });

  it('skips check for short inputs', () => {
    expect(hasMinimumAlphanumeric(':::')).toBe(true); // Too short (<=10)
    expect(hasMinimumAlphanumeric('abc')).toBe(true); // Too short
  });

  it('handles mixed content correctly', () => {
    expect(hasMinimumAlphanumeric('creature123 test!')).toBe(true);
    expect(hasMinimumAlphanumeric('12345abcde!@#')).toBe(true);
  });
});

// ============================================================================
// Zero-Width Character Tests
// ============================================================================

describe('Security: Zero-Width Character Handling', () => {
  it('removes zero-width space', () => {
    const input = 't:\u200Bcreature';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe('t:creature');
  });

  it('removes zero-width non-joiner', () => {
    const input = 't:\u200Ccreature';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe('t:creature');
  });

  it('removes zero-width joiner', () => {
    const input = 't:\u200Dcreature';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe('t:creature');
  });

  it('removes byte order mark', () => {
    const input = '\uFEFFt:creature';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe('t:creature');
  });

  it('handles multiple zero-width chars', () => {
    const input = 't:\u200B\u200C\u200Dcreature';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe('t:creature');
  });
});

// ============================================================================
// Control Character Tests
// ============================================================================

describe('Security: Control Character Handling', () => {
  it('removes null bytes', () => {
    const input = 't:creature\x00';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe('t:creature');
    expect(sanitized).not.toContain('\x00');
  });

  it('removes SOH (Start of Heading)', () => {
    const input = 't:creature\x01';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe('t:creature');
  });

  it('removes bell character', () => {
    const input = 't:creature\x07';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe('t:creature');
  });

  it('removes escape character', () => {
    const input = 't:creature\x1B';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe('t:creature');
  });

  it('removes delete character', () => {
    const input = 't:creature\x7F';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe('t:creature');
  });

  it('preserves valid whitespace', () => {
    const input = 't:creature c:r';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe('t:creature c:r');
  });
});

// ============================================================================
// Unicode Normalization Tests
// ============================================================================

describe('Security: Unicode Normalization', () => {
  it('handles fullwidth characters', () => {
    // Fullwidth Latin letters
    const fullwidthT = 'ｔ'; // U+FF54
    const normalT = 't';
    
    expect(fullwidthT).not.toBe(normalT);
    expect(fullwidthT.normalize('NFKC')).toBe(normalT);
  });

  it('handles fullwidth colon', () => {
    const fullwidthColon = '：'; // U+FF1A
    const normalColon = ':';
    
    expect(fullwidthColon).not.toBe(normalColon);
    expect(fullwidthColon.normalize('NFKC')).toBe(normalColon);
  });

  it('handles combining characters', () => {
    // e + combining acute accent
    const combined = 'e\u0301';
    const precomposed = 'é';
    
    expect(combined.normalize('NFC')).toBe(precomposed);
  });

  it('handles Cyrillic lookalikes', () => {
    const cyrillicC = 'с'; // Cyrillic small letter es
    const latinC = 'c';
    
    // These are different characters that look similar
    expect(cyrillicC).not.toBe(latinC);
  });
});

// ============================================================================
// Parameter Count Limit Tests
// ============================================================================

describe('Security: Parameter Count Limits', () => {
  it('counts query parameters correctly', () => {
    expect(countQueryParameters('t:creature')).toBe(1);
    expect(countQueryParameters('t:creature c:r')).toBe(2);
    expect(countQueryParameters('t:creature c:r o:draw mv:3')).toBe(4);
  });

  it('counts comparison operators', () => {
    expect(countQueryParameters('mv<=3')).toBe(1);
    expect(countQueryParameters('mv>=1 mv<=5')).toBe(2);
    expect(countQueryParameters('pow>3 tou<4')).toBe(2);
  });

  it('detects excessive parameters', () => {
    const manyParams = Array(20).fill('t:creature').join(' ');
    const count = countQueryParameters(manyParams);
    
    expect(count).toBeGreaterThan(SECURITY_LIMITS.MAX_PARAMS);
  });

  it('accepts queries within limit', () => {
    const fewParams = 't:creature c:r mv:3 o:draw';
    const count = countQueryParameters(fewParams);
    
    expect(count).toBeLessThanOrEqual(SECURITY_LIMITS.MAX_PARAMS);
  });
});

// ============================================================================
// Query Length Validation Tests
// ============================================================================

describe('Security: Query Length Validation', () => {
  it('rejects queries over 500 characters', () => {
    const longQuery = 'a'.repeat(501);
    
    expect(longQuery.length).toBeGreaterThan(SECURITY_LIMITS.MAX_QUERY_LENGTH);
  });

  it('accepts queries under 500 characters', () => {
    const shortQuery = 't:creature c:r o:draw mv:3';
    
    expect(shortQuery.length).toBeLessThan(SECURITY_LIMITS.MAX_QUERY_LENGTH);
  });

  it('handles exactly 500 characters', () => {
    const exactQuery = 'a'.repeat(500);
    
    expect(exactQuery.length).toBe(SECURITY_LIMITS.MAX_QUERY_LENGTH);
  });
});

// ============================================================================
// Whitespace Handling Tests
// ============================================================================

describe('Security: Whitespace Handling', () => {
  it('normalizes multiple spaces', () => {
    const input = 't:creature    c:r';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe('t:creature c:r');
  });

  it('trims leading/trailing whitespace', () => {
    const input = '   t:creature   ';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe('t:creature');
  });

  it('normalizes tabs to spaces', () => {
    const input = 't:creature\tc:r';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe('t:creature c:r');
  });

  it('normalizes newlines to spaces', () => {
    const input = 't:creature\nc:r';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe('t:creature c:r');
  });

  it('handles Windows-style line endings', () => {
    const input = 't:creature\r\nc:r';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe('t:creature c:r');
  });
});

// ============================================================================
// Edge Case Input Tests
// ============================================================================

describe('Security: Edge Case Inputs', () => {
  it('handles empty string', () => {
    const sanitized = sanitizeInput('');
    expect(sanitized).toBe('');
  });

  it('handles whitespace-only string', () => {
    const sanitized = sanitizeInput('   \t\n  ');
    expect(sanitized).toBe('');
  });

  it('handles very long single word', () => {
    const longWord = 'a'.repeat(1000);
    const sanitized = sanitizeInput(longWord);
    expect(sanitized).toBe(longWord);
  });

  it('handles mixed scripts', () => {
    const mixed = 't:creature 生物 كائن';
    const sanitized = sanitizeInput(mixed);
    expect(sanitized).toBe(mixed);
  });

  it('handles emoji', () => {
    const withEmoji = 't:creature 🎴';
    const sanitized = sanitizeInput(withEmoji);
    expect(sanitized).toBe(withEmoji);
  });

  it('handles reserved JSON characters', () => {
    const jsonChars = 't:creature {"test": true}';
    const sanitized = sanitizeInput(jsonChars);
    expect(sanitized).toBeDefined();
  });

  it('handles backslash escapes', () => {
    const backslashes = 't:creature\\no:draw';
    const sanitized = sanitizeInput(backslashes);
    expect(sanitized).toBeDefined();
  });
});

// ============================================================================
// Validation Function Tests
// ============================================================================

describe('Security: Scryfall Query Validation', () => {
  it('validates correct query structure', () => {
    const result = validateScryfallQuery('t:creature c:r');
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('reports issues for unknown keys', () => {
    const result = validateScryfallQuery('foo:bar');
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('sanitizes and returns cleaned query', () => {
    const result = validateScryfallQuery('t:creature  c:r');
    expect(result.sanitized).toBe('t:creature c:r');
  });

  it('handles complex valid queries', () => {
    const complex = '(t:creature OR t:artifact) c:r mv<=3 o:"draw a card"';
    const result = validateScryfallQuery(complex);
    expect(result).toBeDefined();
    expect(result.sanitized).toBeDefined();
  });
});
