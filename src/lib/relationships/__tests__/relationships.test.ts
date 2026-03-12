/**
 * Tests for card relationship scoring, normalization, and ranking.
 * @module lib/relationships/__tests__
 */

import { describe, it, expect } from 'vitest';
import { normalizeCardId, normalizeDeckEntry, canonicalPairKey } from '../normalization';
import { computeCoPlayScore, normalizeRelationshipWeight, RELATIONSHIP_TYPES } from '../scoring';
import { rankRelationships, filterByType, getRelationshipLabel } from '../ranking';
import type { RankedRelationship } from '../ranking';

// ─── normalization ──────────────────────────────────────

describe('normalizeCardId', () => {
  it('trims and lowercases', () => {
    expect(normalizeCardId('  ABC-123  ')).toBe('abc-123');
  });

  it('handles already normalized IDs', () => {
    expect(normalizeCardId('abc')).toBe('abc');
  });
});

describe('normalizeDeckEntry', () => {
  it('normalizes card names', () => {
    expect(normalizeDeckEntry('  Sol   Ring  ')).toBe('sol ring');
  });
});

describe('canonicalPairKey', () => {
  it('orders alphabetically', () => {
    expect(canonicalPairKey('bbb', 'aaa')).toBe('aaa|bbb');
    expect(canonicalPairKey('aaa', 'bbb')).toBe('aaa|bbb');
  });

  it('is symmetric', () => {
    expect(canonicalPairKey('x', 'y')).toBe(canonicalPairKey('y', 'x'));
  });
});

// ─── scoring ────────────────────────────────────────────

describe('computeCoPlayScore', () => {
  it('returns 0 for invalid inputs', () => {
    expect(computeCoPlayScore(0, 10, 10)).toBe(0);
    expect(computeCoPlayScore(5, 0, 10)).toBe(0);
    expect(computeCoPlayScore(5, 10, 0)).toBe(0);
    expect(computeCoPlayScore(-1, 10, 10)).toBe(0);
  });

  it('returns 0 when decksBoth exceeds individual counts', () => {
    expect(computeCoPlayScore(15, 10, 10)).toBe(0);
  });

  it('computes correct PMI-style score', () => {
    // both=10, A=100, B=100 → 10 / sqrt(10000) = 10/100 = 0.1
    expect(computeCoPlayScore(10, 100, 100)).toBeCloseTo(0.1);
  });

  it('returns 1 when perfectly correlated', () => {
    // both=10, A=10, B=10 → 10 / sqrt(100) = 10/10 = 1
    expect(computeCoPlayScore(10, 10, 10)).toBe(1);
  });

  it('penalizes universally popular cards', () => {
    // Card A is in 1000 decks (staple), Card B in 50 decks
    // They appear together in 45 decks
    const score = computeCoPlayScore(45, 1000, 50);
    // 45 / sqrt(50000) ≈ 0.201
    expect(score).toBeGreaterThan(0.1);
    expect(score).toBeLessThan(0.3);
  });

  it('rewards niche synergies', () => {
    // Two niche cards: A in 20, B in 15, both in 12
    const nicheScore = computeCoPlayScore(12, 20, 15);
    // Two popular cards: A in 500, B in 400, both in 12
    const popularScore = computeCoPlayScore(12, 500, 400);
    expect(nicheScore).toBeGreaterThan(popularScore);
  });
});

describe('normalizeRelationshipWeight', () => {
  it('returns 0 for invalid inputs', () => {
    expect(normalizeRelationshipWeight(5, 0)).toBe(0);
    expect(normalizeRelationshipWeight(0, 10)).toBe(0);
  });

  it('normalizes to 0-1 range', () => {
    expect(normalizeRelationshipWeight(5, 10)).toBe(0.5);
    expect(normalizeRelationshipWeight(10, 10)).toBe(1);
  });

  it('caps at 1', () => {
    expect(normalizeRelationshipWeight(15, 10)).toBe(1);
  });
});

describe('RELATIONSHIP_TYPES', () => {
  it('includes required types', () => {
    expect(RELATIONSHIP_TYPES).toContain('co_played');
    expect(RELATIONSHIP_TYPES).toContain('similar_role');
    expect(RELATIONSHIP_TYPES).toContain('budget_alternative');
    expect(RELATIONSHIP_TYPES).toContain('archetype_core');
  });
});

// ─── ranking ────────────────────────────────────────────

function makeRel(overrides: Partial<RankedRelationship>): RankedRelationship {
  return {
    oracleId: 'test-id',
    cardName: 'Test Card',
    weight: 0.5,
    cooccurrenceCount: 10,
    relationshipType: 'co_played',
    manaCost: null,
    typeLine: null,
    imageUrl: null,
    ...overrides,
  };
}

describe('rankRelationships', () => {
  it('sorts by weight descending', () => {
    const rels = [
      makeRel({ oracleId: 'a', weight: 0.3 }),
      makeRel({ oracleId: 'b', weight: 0.8 }),
      makeRel({ oracleId: 'c', weight: 0.5 }),
    ];
    const ranked = rankRelationships(rels);
    expect(ranked.map((r) => r.oracleId)).toEqual(['b', 'c', 'a']);
  });

  it('uses cooccurrence count as tiebreaker', () => {
    const rels = [
      makeRel({ oracleId: 'a', weight: 0.5, cooccurrenceCount: 5 }),
      makeRel({ oracleId: 'b', weight: 0.5, cooccurrenceCount: 20 }),
    ];
    const ranked = rankRelationships(rels);
    expect(ranked[0].oracleId).toBe('b');
  });

  it('respects limit', () => {
    const rels = Array.from({ length: 10 }, (_, i) =>
      makeRel({ oracleId: `card-${i}`, weight: i / 10 }),
    );
    expect(rankRelationships(rels, 3)).toHaveLength(3);
  });

  it('does not mutate input', () => {
    const rels = [
      makeRel({ oracleId: 'a', weight: 0.3 }),
      makeRel({ oracleId: 'b', weight: 0.8 }),
    ];
    const original = [...rels];
    rankRelationships(rels);
    expect(rels[0].oracleId).toBe(original[0].oracleId);
  });

  it('returns empty array for empty input', () => {
    expect(rankRelationships([])).toEqual([]);
  });
});

describe('filterByType', () => {
  it('filters correctly', () => {
    const rels = [
      makeRel({ relationshipType: 'co_played' }),
      makeRel({ relationshipType: 'budget_alternative' }),
      makeRel({ relationshipType: 'co_played' }),
    ];
    expect(filterByType(rels, 'co_played')).toHaveLength(2);
    expect(filterByType(rels, 'budget_alternative')).toHaveLength(1);
    expect(filterByType(rels, 'similar_role')).toHaveLength(0);
  });
});

describe('getRelationshipLabel', () => {
  it('returns labels for all types', () => {
    expect(getRelationshipLabel('co_played')).toBe('Commonly played with');
    expect(getRelationshipLabel('similar_role')).toBe('Similar role');
    expect(getRelationshipLabel('budget_alternative')).toBe('Budget alternative');
    expect(getRelationshipLabel('archetype_core')).toBe('Core in archetype');
    expect(getRelationshipLabel('user_behavior_related')).toBe('Players also viewed');
  });
});
