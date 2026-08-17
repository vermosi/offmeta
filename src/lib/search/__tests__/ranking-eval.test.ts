import { describe, expect, it } from 'vitest';
import type { ScryfallCard } from '@/types/card';
import type { SearchIntent } from '@/types/search';
import { rerankCardsWithIntelligence } from '../intelligence-ranking';
import { evaluateRanking } from '../ranking-eval';

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

function baselineRanker(cards: ScryfallCard[]): ScryfallCard[] {
  return [...cards].sort(
    (a, b) => (a.edhrec_rank ?? 99999) - (b.edhrec_rank ?? 99999),
  );
}

describe('ranking-eval', () => {
  it('shows the current ranker beating a popularity baseline on curated fixtures', () => {
    const intent1: SearchIntent = {
      colors: {
        values: ['U'],
        isIdentity: true,
        isExact: false,
        isOr: false,
      },
      types: ['instant'],
      cmc: { op: '<=', value: 2 },
      power: null,
      toughness: null,
      tags: [],
      oraclePatterns: ['counter target spell'],
      warnings: [],
    };

    const intent2: SearchIntent = {
      colors: null,
      types: ['artifact'],
      cmc: null,
      power: null,
      toughness: null,
      tags: ['otag:repeatable-treasures'],
      oraclePatterns: ['create treasure'],
      warnings: [],
    };

    const intent3: SearchIntent = {
      colors: null,
      types: ['enchantment'],
      cmc: null,
      power: null,
      toughness: null,
      tags: [],
      oraclePatterns: ['draw a card'],
      warnings: [],
    };

    const cases = [
      {
        name: 'counterspell-like intent',
        intent: intent1,
        relevant: ['Counterspell'],
        cards: [
          makeCard({
            name: 'Sol Ring',
            type_line: 'Artifact',
            edhrec_rank: 1,
          }),
          makeCard({
            name: 'Counterspell',
            type_line: 'Instant',
            color_identity: ['U'],
            colors: ['U'],
            cmc: 2,
            oracle_text: 'Counter target spell.',
            edhrec_rank: 250,
          }),
        ],
      },
      {
        name: 'treasure-maker intent',
        intent: intent2,
        relevant: ['Dockside Extortionist'],
        cards: [
          makeCard({
            name: 'Arcane Signet',
            type_line: 'Artifact',
            edhrec_rank: 5,
          }),
          makeCard({
            name: 'Dockside Extortionist',
            type_line: 'Creature',
            color_identity: ['R'],
            colors: ['R'],
            cmc: 2,
            oracle_text:
              'When this enters the battlefield, create treasure tokens.',
            edhrec_rank: 1000,
          }),
        ],
      },
      {
        name: 'draw engine intent',
        intent: intent3,
        relevant: ['Rhystic Study'],
        cards: [
          makeCard({
            name: 'Mystic Remora',
            type_line: 'Enchantment',
            oracle_text:
              'Whenever an opponent casts a spell, you may draw a card.',
            edhrec_rank: 10,
          }),
          makeCard({
            name: 'Rhystic Study',
            type_line: 'Enchantment',
            oracle_text:
              'Whenever an opponent casts a spell, you may draw a card.',
            edhrec_rank: 2,
          }),
        ],
      },
    ];

    const current = evaluateRanking(cases, (cards, intent) =>
      rerankCardsWithIntelligence(cards, {
        queryQualityScore: 0.2,
        queryConfidence: 0.9,
        querySampleSize: 40,
        ownedCards,
        hadFastClick: false,
        hadRefinement: false,
        isAuthenticated: false,
        intent,
      }),
    );
    const baseline = evaluateRanking(cases, (cards) => baselineRanker(cards));

    expect(current.totalCases).toBe(3);
    expect(current.top1Accuracy).toBeGreaterThanOrEqual(baseline.top1Accuracy);
    expect(current.mrr).toBeGreaterThanOrEqual(baseline.mrr);
    expect(current.ndcgAt5).toBeGreaterThanOrEqual(baseline.ndcgAt5);
    expect(current.top1Accuracy).toBeGreaterThan(0.66);
  });
});
