import { describe, it, expect } from 'vitest';
import { sortDeckCards } from '../sort-deck-cards';
import type { DeckCard } from '@/hooks/useDeck';
import type { ScryfallCard } from '@/types/card';

function makeDeckCard(name: string, overrides?: Partial<DeckCard>): DeckCard {
  return {
    id: name,
    deck_id: 'deck-1',
    card_name: name,
    quantity: 1,
    board: 'mainboard',
    is_commander: false,
    is_companion: false,
    category: null,
    scryfall_id: null,
    created_at: '',
    ...overrides,
  };
}

function makeScryfallCard(name: string, overrides?: Partial<ScryfallCard>): ScryfallCard {
  return {
    id: name,
    name,
    cmc: 3,
    color_identity: ['G'],
    type_line: 'Creature',
    colors: [],
    rarity: 'common',
    prices: { usd: '1.00' },
    ...overrides,
  } as unknown as ScryfallCard;
}

describe('sortDeckCards', () => {
  const cache = new Map<string, ScryfallCard>();
  cache.set('Alpha', makeScryfallCard('Alpha', { cmc: 2, color_identity: ['W'] as string[], prices: { usd: '5.00' } as Record<string, string> }));
  cache.set('Beta', makeScryfallCard('Beta', { cmc: 4, color_identity: ['U'] as string[], prices: { usd: '1.00' } as Record<string, string> }));
  cache.set('Gamma', makeScryfallCard('Gamma', { cmc: 1, color_identity: ['R'] as string[], prices: { usd: '10.00' } as Record<string, string> }));

  const cards = [makeDeckCard('Beta'), makeDeckCard('Alpha'), makeDeckCard('Gamma')];

  it('sorts by name alphabetically', () => {
    const sorted = sortDeckCards(cards, 'name', cache);
    expect(sorted.map((c) => c.card_name)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('sorts by cmc ascending', () => {
    const sorted = sortDeckCards(cards, 'cmc', cache);
    expect(sorted.map((c) => c.card_name)).toEqual(['Gamma', 'Alpha', 'Beta']);
  });

  it('sorts by color in WUBRG order', () => {
    const sorted = sortDeckCards(cards, 'color', cache);
    // W=0, U=1, R=3
    expect(sorted.map((c) => c.card_name)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('sorts by price descending', () => {
    const sorted = sortDeckCards(cards, 'price', cache);
    expect(sorted.map((c) => c.card_name)).toEqual(['Gamma', 'Alpha', 'Beta']);
  });

  it('returns same order for category sort (no-op)', () => {
    const sorted = sortDeckCards(cards, 'category', cache);
    expect(sorted.map((c) => c.card_name)).toEqual(['Beta', 'Alpha', 'Gamma']);
  });

  it('handles cards not in cache', () => {
    const unknownCards = [makeDeckCard('Unknown'), makeDeckCard('Alpha')];
    const sorted = sortDeckCards(unknownCards, 'cmc', cache);
    // Unknown has cmc=99 (fallback), Alpha has cmc=2
    expect(sorted[0].card_name).toBe('Alpha');
  });
});
