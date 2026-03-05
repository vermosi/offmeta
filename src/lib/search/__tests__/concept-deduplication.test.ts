/**
 * Tests for concept matching category deduplication logic.
 * Ensures that only one concept per category is included in the final query,
 * preventing unrelated filters (e.g., c:w from "white board wipes") from leaking
 * into queries like "board whipe".
 * @module lib/search/__tests__/concept-deduplication
 */

import { describe, it, expect } from 'vitest';
import type { ConceptMatch } from '../../../../supabase/functions/semantic-search/pipeline/types';

/**
 * Mirrors the deduplication logic from semantic-search/index.ts (step 6c).
 * Extracted here for unit-testability without needing to spin up the full edge function.
 */
function deduplicateConceptsByCategory(concepts: ConceptMatch[]): ConceptMatch[] {
  const seenCategories = new Set<string>();
  return concepts.filter((c) => {
    if (seenCategories.has(c.category)) return false;
    seenCategories.add(c.category);
    return true;
  });
}

function buildConceptQuery(
  dedupedConcepts: ConceptMatch[],
  deterministicQuery: string,
): string {
  const conceptParts = dedupedConcepts.map((c) => c.scryfallSyntax);
  let conceptQuery = conceptParts.join(' ');
  if (deterministicQuery) {
    conceptQuery = `${deterministicQuery} ${conceptQuery}`;
  }
  return conceptQuery;
}

// Helper to create a mock ConceptMatch
function mockConcept(overrides: Partial<ConceptMatch>): ConceptMatch {
  return {
    conceptId: 'test',
    pattern: 'test',
    scryfallSyntax: 'o:test',
    templates: ['o:test'],
    negativeTemplates: [],
    description: 'Test concept',
    confidence: 0.95,
    category: 'general',
    priority: 85,
    similarity: 1.0,
    matchType: 'exact',
    ...overrides,
  };
}

describe('Concept deduplication by category', () => {
  it('keeps first concept per category, removes duplicates', () => {
    const concepts: ConceptMatch[] = [
      mockConcept({ conceptId: 'board_wipe', category: 'removal', scryfallSyntax: 'otag:board-wipe', similarity: 1.0 }),
      mockConcept({ conceptId: 'white_board_wipes', category: 'removal', scryfallSyntax: 'otag:board-wipe c:w', similarity: 0.9 }),
      mockConcept({ conceptId: 'board_wipes', category: 'removal', scryfallSyntax: 'otag:board-wipe', similarity: 0.85 }),
    ];

    const deduped = deduplicateConceptsByCategory(concepts);

    expect(deduped).toHaveLength(1);
    expect(deduped[0].conceptId).toBe('board_wipe');
  });

  it('prevents c:w color leak from "white board wipes" matching on "board whipe"', () => {
    const concepts: ConceptMatch[] = [
      mockConcept({ conceptId: 'board_wipe', category: 'removal', scryfallSyntax: 'otag:board-wipe', similarity: 1.0 }),
      mockConcept({ conceptId: 'white_board_wipes', category: 'removal', scryfallSyntax: 'otag:board-wipe c:w', similarity: 0.85 }),
    ];

    const deduped = deduplicateConceptsByCategory(concepts);
    const query = buildConceptQuery(deduped, '');

    expect(query).not.toContain('c:w');
    expect(query).toContain('otag:board-wipe');
  });

  it('keeps concepts from different categories', () => {
    const concepts: ConceptMatch[] = [
      mockConcept({ conceptId: 'ramp', category: 'ramp', scryfallSyntax: 'otag:ramp' }),
      mockConcept({ conceptId: 'removal', category: 'removal', scryfallSyntax: 'otag:removal' }),
      mockConcept({ conceptId: 'draw', category: 'card_advantage', scryfallSyntax: 'otag:card-draw' }),
    ];

    const deduped = deduplicateConceptsByCategory(concepts);

    expect(deduped).toHaveLength(3);
  });

  it('handles empty concepts list', () => {
    const deduped = deduplicateConceptsByCategory([]);
    expect(deduped).toHaveLength(0);
  });

  it('handles single concept', () => {
    const concepts = [mockConcept({ conceptId: 'ramp', category: 'ramp' })];
    const deduped = deduplicateConceptsByCategory(concepts);
    expect(deduped).toHaveLength(1);
  });

  it('keeps sacrifice category to one concept (edict vs sacrifice_outlet vs aristocrats)', () => {
    const concepts: ConceptMatch[] = [
      mockConcept({ conceptId: 'edict', category: 'sacrifice', scryfallSyntax: 'o:"sacrifices"', similarity: 1.0 }),
      mockConcept({ conceptId: 'sacrifice_outlet', category: 'sacrifice', scryfallSyntax: 'otag:sacrifice-outlet', similarity: 0.85 }),
      mockConcept({ conceptId: 'aristocrats', category: 'sacrifice', scryfallSyntax: 'otag:aristocrats', similarity: 0.8 }),
    ];

    const deduped = deduplicateConceptsByCategory(concepts);

    expect(deduped).toHaveLength(1);
    expect(deduped[0].conceptId).toBe('edict');
  });

  it('prepends deterministic query to concept query', () => {
    const concepts = [mockConcept({ conceptId: 'ramp', category: 'ramp', scryfallSyntax: 'otag:ramp' })];
    const deduped = deduplicateConceptsByCategory(concepts);
    const query = buildConceptQuery(deduped, 'c:g mv<=3');

    expect(query).toBe('c:g mv<=3 otag:ramp');
  });

  it('does not prepend when deterministic query is empty', () => {
    const concepts = [mockConcept({ conceptId: 'ramp', category: 'ramp', scryfallSyntax: 'otag:ramp' })];
    const deduped = deduplicateConceptsByCategory(concepts);
    const query = buildConceptQuery(deduped, '');

    expect(query).toBe('otag:ramp');
  });
});
