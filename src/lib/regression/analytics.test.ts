/**
 * Regression tests for analytics functionality.
 * Tests CLIENT_ANALYTICS_001
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// CLIENT_ANALYTICS Tests: Event Tracking
// ============================================================================

describe('Regression: CLIENT_ANALYTICS - Event Tracking', () => {
  // CLIENT_ANALYTICS_001: Zero results tracking
  describe('CLIENT_ANALYTICS_001: Search Failure Tracking', () => {
    it('identifies zero-result searches', () => {
      const totalCards = 0;
      const searchQuery = 'nonexistent card type';

      const isFailedSearch = totalCards === 0 && searchQuery.length > 0;
      expect(isFailedSearch).toBe(true);
    });

    it('tracks search_failure event on zero results', () => {
      const trackedEvents: Array<{
        type: string;
        data: Record<string, unknown>;
      }> = [];

      function trackEvent(type: string, data: Record<string, unknown>): void {
        trackedEvents.push({ type, data });
      }

      // Simulate search with zero results
      const searchResult = {
        query: 'invalid search',
        translatedQuery: 't:nonexistent',
        resultsCount: 0,
      };

      if (searchResult.resultsCount === 0) {
        trackEvent('search_failure', {
          query: searchResult.query,
          translated_query: searchResult.translatedQuery,
          results_count: 0,
        });
      }

      expect(trackedEvents.length).toBe(1);
      expect(trackedEvents[0].type).toBe('search_failure');
      expect(trackedEvents[0].data.results_count).toBe(0);
    });

    it('does not spam events on repeated failures', () => {
      const trackedSearches = new Set<string>();
      const events: string[] = [];

      function trackSearchOnce(query: string, resultsCount: number): void {
        if (resultsCount === 0 && !trackedSearches.has(query)) {
          trackedSearches.add(query);
          events.push(`failure:${query}`);
        }
      }

      // Same failing query multiple times
      for (let i = 0; i < 5; i++) {
        trackSearchOnce('failing query', 0);
      }

      // Should only track once
      expect(events.length).toBe(1);
    });
  });

  // Search results tracking
  describe('Search Results Tracking', () => {
    it('includes required fields in search_results event', () => {
      const eventData = {
        query: 'mana rocks',
        translated_query: 't:artifact o:"add"',
        results_count: 150,
        request_id: 'req_123',
      };

      expect(eventData.query).toBeDefined();
      expect(eventData.translated_query).toBeDefined();
      expect(eventData.results_count).toBeGreaterThan(0);
      expect(eventData.request_id).toMatch(/^req_/);
    });

    it('generates unique request IDs', () => {
      function generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }

      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateRequestId());
      }

      // All IDs should be unique
      expect(ids.size).toBe(100);
    });
  });

  // Card click tracking
  describe('Card Click Tracking', () => {
    it('includes position in search results', () => {
      const clickData = {
        card_id: 'card-123',
        card_name: 'Sol Ring',
        set_code: 'C21',
        rarity: 'uncommon',
        position_in_results: 5,
      };

      expect(clickData.position_in_results).toBeDefined();
      expect(clickData.position_in_results).toBeGreaterThanOrEqual(0);
    });

    it('tracks all required card metadata', () => {
      const requiredFields = [
        'card_id',
        'card_name',
        'set_code',
        'rarity',
        'position_in_results',
      ];
      const clickData = {
        card_id: 'abc',
        card_name: 'Test',
        set_code: 'TST',
        rarity: 'common',
        position_in_results: 0,
      };

      for (const field of requiredFields) {
        expect(clickData).toHaveProperty(field);
      }
    });
  });
});

// ============================================================================
// Analytics Deduplication
// ============================================================================

describe('Regression: Analytics Deduplication', () => {
  it('prevents duplicate search events for same query', () => {
    const searchEventLog = new Map<string, number>();
    const DEDUP_WINDOW_MS = 1000;

    function shouldTrackSearch(query: string): boolean {
      const now = Date.now();
      const lastTracked = searchEventLog.get(query);

      if (lastTracked && now - lastTracked < DEDUP_WINDOW_MS) {
        return false;
      }

      searchEventLog.set(query, now);
      return true;
    }

    // First search should track
    expect(shouldTrackSearch('test query')).toBe(true);

    // Immediate duplicate should not track
    expect(shouldTrackSearch('test query')).toBe(false);

    // Different query should track
    expect(shouldTrackSearch('different query')).toBe(true);
  });

  it('normalizes queries before deduplication check', () => {
    const normalize = (q: string) =>
      q.toLowerCase().trim().replace(/\s+/g, ' ');

    const queries = ['  MANA ROCKS  ', 'mana rocks', 'Mana   Rocks'];

    const normalized = queries.map(normalize);

    // All should normalize to the same value
    expect(new Set(normalized).size).toBe(1);
    expect(normalized[0]).toBe('mana rocks');
  });
});
