/**
 * Tests for utils re-export.
 * @module lib/utils-re-export.test
 */

import { describe, it, expect } from 'vitest';
import { cn } from './utils';
import { cn as coreCn } from './core/utils';

describe('lib/utils re-export', () => {
  it('exports cn from core/utils', () => {
    expect(cn).toBe(coreCn);
  });

  it('cn works correctly', () => {
    expect(cn('a', 'b')).toBe('a b');
    const condition = false;
    expect(cn('a', condition && 'b', 'c')).toBe('a c');
    expect(cn('px-4', 'px-2')).toBe('px-2');
  });
});
