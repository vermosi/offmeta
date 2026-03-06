/**
 * Tests for concept matching deduplication and color-stripping logic.
 * Ensures that:
 * 1. Only one concept per normalized category is kept
 * 2. Color constraints are stripped from concept templates when user didn't specify a color
 * @module lib/search/__tests__/concept-deduplication
 */

import { describe, it, expect } from 'vitest';
import type { ConceptMatch } from '../../../../supabase/functions/semantic-search/pipeline/types';

/**
 * Mirrors the normalized category deduplication from semantic-search/index.ts (step 6c).
 */
function deduplicateConceptsByNormalizedCategory(concepts: ConceptMatch[]): ConceptMatch[] {
  const seenCategories = new Set<string>();
  return concepts.filter((c) => {
    const normCat = (c.category || '').toLowerCase()
      .replace(/\b(cards?\s+that\s+|spells?\s*)/g, '')
      .trim();
    if (seenCategories.has(normCat)) return false;
    seenCategories.add(normCat);
    return true;
  });
}

/**
 * Mirrors the color-stripping logic from semantic-search/index.ts (step 6c).
 */
function stripColorConstraints(syntax: string): string {
  return syntax.replace(/\b(c|ci)(:|<=|>=|=|<|>)\S+/gi, '').replace(/\s+/g, ' ').trim();
}

function buildConceptQuery(
  dedupedConcepts: ConceptMatch[],
  deterministicQuery: string,
  userSpecifiedColor: boolean,
): string {
  const conceptParts = dedupedConcepts.map((c) => {
    let syntax = c.scryfallSyntax;
    if (!userSpecifiedColor) {
      syntax = stripColorConstraints(syntax);
    }
    return syntax;
  }).filter(Boolean);
  let conceptQuery = conceptParts.join(' ');
  if (deterministicQuery) {
    conceptQuery = `${deterministicQuery} ${conceptQuery}`;
  }
  return conceptQuery;
}

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

describe('Concept deduplication by normalized category', () => {
  it('deduplicates DB concepts with variant category names', () => {
    // Real DB scenario: "board whipe" returns concepts with different but related categories
    const concepts: ConceptMatch[] = [
      mockConcept({ conceptId: 'board_wipe', category: 'Cards that destroy all creatures', scryfallSyntax: 'otag:board-wipe' }),
      mockConcept({ conceptId: 'white_board_wipes', category: 'White mass removal', scryfallSyntax: 'c:w (o:"destroy all" or o:"exile all")' }),
      mockConcept({ conceptId: 'board_wipes', category: 'Mass removal', scryfallSyntax: '(o:"destroy all" or o:"exile all")' }),
      mockConcept({ conceptId: 'boardwipes', category: 'Mass removal spells', scryfallSyntax: 'o:"destroy all" or o:"exile all"' }),
    ];

    const deduped = deduplicateConceptsByNormalizedCategory(concepts);
    // "Cards that destroy all creatures" → "destroy all creatures"
    // "White mass removal" → "white mass removal"
    // "Mass removal" → "mass removal"
    // "Mass removal spells" → "mass removal" (duplicate of above!)
    expect(deduped.length).toBeLessThan(concepts.length);
    // "Mass removal spells" normalized = "mass removal" = same as "Mass removal"
    expect(deduped.find(c => c.conceptId === 'boardwipes')).toBeUndefined();
  });

  it('keeps concepts from genuinely different categories', () => {
    const concepts: ConceptMatch[] = [
      mockConcept({ conceptId: 'ramp', category: 'ramp', scryfallSyntax: 'otag:ramp' }),
      mockConcept({ conceptId: 'removal', category: 'removal', scryfallSyntax: 'otag:removal' }),
      mockConcept({ conceptId: 'draw', category: 'card advantage', scryfallSyntax: 'otag:card-draw' }),
    ];
    expect(deduplicateConceptsByNormalizedCategory(concepts)).toHaveLength(3);
  });

  it('handles empty list', () => {
    expect(deduplicateConceptsByNormalizedCategory([])).toHaveLength(0);
  });
});

describe('Color constraint stripping', () => {
  it('strips c:w from concept syntax', () => {
    expect(stripColorConstraints('c:w (o:"destroy all" or o:"exile all")')).toBe('(o:"destroy all" or o:"exile all")');
  });

  it('strips ci<=wubrg from concept syntax', () => {
    expect(stripColorConstraints('ci<=wubrg otag:ramp')).toBe('otag:ramp');
  });

  it('strips c:g from concept syntax', () => {
    expect(stripColorConstraints('c:g otag:ramp')).toBe('otag:ramp');
  });

  it('does not strip non-color operators', () => {
    expect(stripColorConstraints('otag:board-wipe')).toBe('otag:board-wipe');
    expect(stripColorConstraints('o:"destroy all"')).toBe('o:"destroy all"');
  });

  it('returns empty string when only color constraint exists', () => {
    expect(stripColorConstraints('c:w')).toBe('');
  });
});

describe('End-to-end concept query building (color leak prevention)', () => {
  it('"board whipe" query has no c:w when user did not specify color', () => {
    const concepts: ConceptMatch[] = [
      mockConcept({ conceptId: 'board_wipe', category: 'Cards that destroy all creatures', scryfallSyntax: 'otag:board-wipe' }),
      mockConcept({ conceptId: 'white_board_wipes', category: 'White mass removal', scryfallSyntax: 'c:w (o:"destroy all" or o:"exile all")' }),
      mockConcept({ conceptId: 'board_wipes', category: 'Mass removal', scryfallSyntax: '(o:"destroy all" or o:"exile all")' }),
    ];

    const deduped = deduplicateConceptsByNormalizedCategory(concepts);
    const query = buildConceptQuery(deduped, '', false);

    expect(query).not.toContain('c:w');
    expect(query).toContain('otag:board-wipe');
  });

  it('preserves color when user explicitly specified color', () => {
    const concepts: ConceptMatch[] = [
      mockConcept({ conceptId: 'white_board_wipes', category: 'White mass removal', scryfallSyntax: 'c:w (o:"destroy all" or o:"exile all")' }),
    ];

    const deduped = deduplicateConceptsByNormalizedCategory(concepts);
    const query = buildConceptQuery(deduped, 'c:w', true);

    expect(query).toContain('c:w');
  });

  it('prepends deterministic query to concept query', () => {
    const concepts = [mockConcept({ conceptId: 'ramp', category: 'ramp', scryfallSyntax: 'otag:ramp' })];
    const query = buildConceptQuery(concepts, 'c:g mv<=3', true);
    expect(query).toBe('c:g mv<=3 otag:ramp');
  });

  it('filters out empty syntax after color stripping', () => {
    const concepts: ConceptMatch[] = [
      mockConcept({ conceptId: 'color_only', category: 'color', scryfallSyntax: 'c:w' }),
      mockConcept({ conceptId: 'real_concept', category: 'removal', scryfallSyntax: 'otag:board-wipe' }),
    ];

    const query = buildConceptQuery(concepts, '', false);
    expect(query).toBe('otag:board-wipe');
    expect(query).not.toContain('c:w');
  });
});
