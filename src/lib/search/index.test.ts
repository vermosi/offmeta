/**
 * Tests for search module exports.
 * @module lib/search/index.test
 */

import { describe, it, expect } from 'vitest';
import {
  buildServerSideFilterQuery,
  mergeQueryWithFilters,
  hasActiveServerFilters,
} from './index';

describe('lib/search exports', () => {
  it('exports buildServerSideFilterQuery', () => {
    expect(typeof buildServerSideFilterQuery).toBe('function');
  });

  it('exports mergeQueryWithFilters', () => {
    expect(typeof mergeQueryWithFilters).toBe('function');
  });

  it('exports hasActiveServerFilters', () => {
    expect(typeof hasActiveServerFilters).toBe('function');
  });

  it('buildServerSideFilterQuery works correctly', () => {
    const result = buildServerSideFilterQuery({
      colors: ['R'],
      types: [],
      cmcRange: [0, 16],
      sortBy: 'name-asc',
    });
    expect(result).toBe('c:r');
  });
});
