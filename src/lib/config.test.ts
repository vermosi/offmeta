/**
 * Tests for client-side configuration constants.
 * @module lib/config.test
 */

import { describe, it, expect } from 'vitest';
import { CLIENT_CONFIG } from './config';

describe('CLIENT_CONFIG', () => {
  it('exports virtualization threshold', () => {
    expect(CLIENT_CONFIG.VIRTUALIZATION_THRESHOLD).toBe(50);
  });

  it('exports search settings', () => {
    expect(CLIENT_CONFIG.SEARCH_TIMEOUT_MS).toBe(25000);
    expect(CLIENT_CONFIG.SEARCH_DEBOUNCE_MS).toBe(300);
  });

  it('exports cache settings', () => {
    expect(CLIENT_CONFIG.RESULT_CACHE_TTL_MS).toBe(30 * 60 * 1000);
    expect(CLIENT_CONFIG.MAX_CACHE_SIZE).toBe(50);
    expect(CLIENT_CONFIG.TRANSLATION_STALE_TIME_MS).toBe(24 * 60 * 60 * 1000);
    expect(CLIENT_CONFIG.CARD_SEARCH_STALE_TIME_MS).toBe(15 * 60 * 1000);
  });

  it('exports rate limiting settings', () => {
    expect(CLIENT_CONFIG.SEARCH_RATE_LIMIT.maxPerMinute).toBe(20);
    expect(CLIENT_CONFIG.SEARCH_RATE_LIMIT.cooldownMs).toBe(2000);
  });

  it('exports history settings', () => {
    expect(CLIENT_CONFIG.MAX_HISTORY_ITEMS).toBe(20);
  });

  it('exports UI settings', () => {
    expect(CLIENT_CONFIG.MAX_CARD_WIDTH).toBe(280);
    expect(CLIENT_CONFIG.PROGRESS_ANIMATION_DURATION_MS).toBe(500);
  });

  it('exports infinite scroll settings', () => {
    expect(CLIENT_CONFIG.INFINITE_SCROLL_THRESHOLD).toBe(0.1);
    expect(CLIENT_CONFIG.INFINITE_SCROLL_ROOT_MARGIN).toBe('200px');
  });

  it('config object is defined with all expected keys', () => {
    expect(CLIENT_CONFIG).toBeDefined();
    expect('VIRTUALIZATION_THRESHOLD' in CLIENT_CONFIG).toBe(true);
    expect('SEARCH_TIMEOUT_MS' in CLIENT_CONFIG).toBe(true);
    expect('SEARCH_RATE_LIMIT' in CLIENT_CONFIG).toBe(true);
  });
});
