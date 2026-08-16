import { describe, expect, it } from 'vitest';
import type { ScryfallCard } from '@/types/card';
import type { SearchIntent } from '@/types/search';
import { rerankCardsWithIntelligence } from '../intelligence-ranking';

function makeCard(overrides: Partial<ScryfallCard>): ScryfallCard {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Test Card',
    type_line: overrides.type_line ?? 'Creature',
    oracle_text: overrides.oracle_text ?? '',
    color_identity: overrides.color_identity ?? [],
    colors: overrides.colors ?? [],
    cmc: overrides.cmc ?? 3,
    edhrec_rank: overrides.edhrec_rank ?? 1000,
    prices: overrides.prices ?? {},
    legalities: overrides.legalities ?? {},
    rarity: overrides.rarity ?? 'rare',
    set: overrides.set ?? 'tst',
    set_name: overrides.set_name ?? 'Test Set',
  } as ScryfallCard;
}

const ownedCards = new Map<string, number>();

describe('rerankCardsWithIntelligence', () => {
  it('prefers the card that actually matches explicit color and type intent', () => {
    const intent: SearchIntent = {
      colors: {
        values: ['U'],
        isIdentity: true,
        isExact: false,
        isOr: false,
      },
      types: ['instant'],
      cmc: null,
      power: null,
      toughness: null,
      tags: [],
      oraclePatterns: [],
      warnings: [],
    };

    const compatible = makeCard({
      name: 'Counterspell',
      type_line: 'Instant',
      color_identity: ['U'],
      colors: ['U'],
      edhrec_rank: 6000,
    });
    const popularMismatch = makeCard({
      name: 'Sol Ring',
      type_line: 'Artifact',
      color_identity: [],
      colors: [],
      edhrec_rank: 1,
    });

    const ranked = rerankCardsWithIntelligence([popularMismatch, compatible], {
      queryQualityScore: 0.1,
      queryConfidence: 0.9,
      querySampleSize: 40,
      ownedCards,
      hadFastClick: false,
      hadRefinement: false,
      isAuthenticated: false,
      intent,
    });

    expect(ranked[0].name).toBe('Counterspell');
  });

  it('penalizes explicit type mismatch enough to keep off-plan cards down', () => {
    const intent: SearchIntent = {
      colors: null,
      types: ['artifact'],
      cmc: null,
      power: null,
      toughness: null,
      tags: [],
      oraclePatterns: [],
      warnings: [],
    };

    const intended = makeCard({
      name: 'Arcane Signet',
      type_line: 'Artifact',
      edhrec_rank: 250,
    });
    const wrongType = makeCard({
      name: 'Rhystic Study',
      type_line: 'Enchantment',
      edhrec_rank: 5,
    });

    const ranked = rerankCardsWithIntelligence([wrongType, intended], {
      queryQualityScore: 0.2,
      queryConfidence: 0.8,
      querySampleSize: 50,
      ownedCards,
      hadFastClick: false,
      hadRefinement: false,
      isAuthenticated: false,
      intent,
    });

    expect(ranked[0].name).toBe('Arcane Signet');
  });
});
