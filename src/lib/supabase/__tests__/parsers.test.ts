import { describe, expect, it } from 'vitest';

import {
  EMPTY_COLLECTION_STATS,
  parseCollectionStatsData,
  parseFeedbackItem,
  parseQueryIntelligence,
  parseTranslationRuleRow,
} from '@/lib/supabase/parsers';

describe('supabase parsers', () => {
  it('parses a valid feedback item with relation payload', () => {
    const parsed = parseFeedbackItem({
      id: 'fb_1',
      original_query: 'find dragons',
      translated_query: 't:dragon',
      issue_description: 'bad translation',
      processing_status: 'pending',
      created_at: '2026-01-01T00:00:00Z',
      processed_at: null,
      generated_rule_id: null,
      scryfall_validation_count: 1,
      translation_rules: {
        pattern: 'dragons',
        scryfall_syntax: 't:dragon',
        confidence: 0.8,
        is_active: true,
        description: 'dragon search',
      },
    });

    expect(parsed).toMatchObject({
      id: 'fb_1',
      translation_rules: {
        pattern: 'dragons',
      },
    });
  });

  it('returns null for malformed feedback item payload', () => {
    const parsed = parseFeedbackItem({
      id: 42,
      original_query: 'find dragons',
      issue_description: 'bad translation',
      created_at: '2026-01-01T00:00:00Z',
    });

    expect(parsed).toBeNull();
  });

  it('returns null for malformed translation rule row payload', () => {
    const parsed = parseTranslationRuleRow({
      id: 'rule_1',
      pattern: 'dragons',
      scryfall_syntax: 12,
      created_at: '2026-01-01T00:00:00Z',
    });

    expect(parsed).toBeNull();
  });

  it('returns null for malformed query intelligence payload', () => {
    const parsed = parseQueryIntelligence({
      normalized_query: 'dragons',
      search_quality_score: '0.7',
      confidence: 0.8,
      total_searches: 10,
      successful_searches: 8,
      result_clicks: 6,
      refinements: 1,
      no_results: 0,
      recoveries: 0,
      feedback_reports: 0,
      updated_at: '2026-01-01T00:00:00Z',
    });

    expect(parsed).toBeNull();
  });

  it('returns null for malformed collection stats payload and supports safe fallback', () => {
    const parsed = parseCollectionStatsData({ total_cards: '10' } as never);

    expect(parsed).toBeNull();
    expect(EMPTY_COLLECTION_STATS).toEqual({
      unique_cards: 0,
      total_cards: 0,
      estimated_value: 0,
    });
  });
});
