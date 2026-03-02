/**
 * Unit tests for DeckStats calculation logic.
 * Tests the stats computation that DeckStatsBar uses internally.
 * @module components/deckbuilder/__tests__/DeckStats.test
 */

import { describe, it, expect } from 'vitest';
import type { DeckCard } from '@/hooks/useDeck';
import type { ScryfallCard } from '@/types/card';

// Extract the stats computation logic for testing
function computeStats(cards: DeckCard[], scryfallCache: Map<string, ScryfallCard>, formatMax: number) {
  const curve = new Array(8).fill(0);
  const colorCounts: Record<string, number> = {};
  let totalCmc = 0;
  let nonLandCount = 0;
  let totalPrice = 0;
  let priceCount = 0;

  for (const dc of cards) {
    const sc = scryfallCache.get(dc.card_name);
    const qty = dc.quantity;
    const isLand = dc.category === 'Lands' || sc?.type_line?.toLowerCase().includes('land');

    if (!isLand) {
      const cmc = sc?.cmc ?? 0;
      const bucket = Math.min(Math.floor(cmc), 7);
      curve[bucket] += qty;
      totalCmc += cmc * qty;
      nonLandCount += qty;
    }

    if (sc) {
      const colors = sc.color_identity || [];
      for (const c of colors) {
        colorCounts[c] = (colorCounts[c] || 0) + qty;
      }
      if (colors.length === 0 && !isLand) {
        colorCounts['C'] = (colorCounts['C'] || 0) + qty;
      }
    }

    if (sc?.prices?.usd) {
      const price = parseFloat(sc.prices.usd);
      if (!isNaN(price)) {
        totalPrice += price * qty;
        priceCount += qty;
      }
    }
  }

  const totalCards = cards.reduce((s, c) => s + c.quantity, 0);
  const avgCmc = nonLandCount > 0 ? (totalCmc / nonLandCount).toFixed(2) : '0.00';

  return { curve, colorCounts, totalCards, avgCmc, totalPrice, priceCount, formatMax };
}

function makeDeckCard(overrides: Partial<DeckCard> & { card_name: string }): DeckCard {
  return {
    id: crypto.randomUUID(),
    deck_id: 'test-deck',
    quantity: 1,
    is_commander: false,
    is_companion: false,
    created_at: new Date().toISOString(),
    board: 'mainboard',
    category: null,
    scryfall_id: null,
    ...overrides,
  };
}

function makeScryfallCard(overrides: Partial<ScryfallCard> & { name: string }): ScryfallCard {
  const { name, ...rest } = overrides;
  return {
    id: crypto.randomUUID(),
    object: 'card',
    name,
    type_line: 'Artifact',
    cmc: 0,
    color_identity: [],
    prices: {},
    ...rest,
  } as ScryfallCard;
}

describe('DeckStats computeStats', () => {
  it('returns zeroed stats for empty deck', () => {
    const stats = computeStats([], new Map(), 100);
    expect(stats.totalCards).toBe(0);
    expect(stats.avgCmc).toBe('0.00');
    expect(stats.totalPrice).toBe(0);
    expect(stats.curve).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(stats.colorCounts).toEqual({});
  });

  it('computes mana curve correctly', () => {
    const cards = [
      makeDeckCard({ card_name: 'Sol Ring', quantity: 1 }),
      makeDeckCard({ card_name: 'Lightning Bolt', quantity: 4 }),
      makeDeckCard({ card_name: 'Wrath of God', quantity: 1 }),
    ];
    const cache = new Map<string, ScryfallCard>([
      ['Sol Ring', makeScryfallCard({ name: 'Sol Ring', cmc: 1, type_line: 'Artifact' })],
      ['Lightning Bolt', makeScryfallCard({ name: 'Lightning Bolt', cmc: 1, type_line: 'Instant', color_identity: ['R'] })],
      ['Wrath of God', makeScryfallCard({ name: 'Wrath of God', cmc: 4, type_line: 'Sorcery', color_identity: ['W'] })],
    ]);
    const stats = computeStats(cards, cache, 60);
    expect(stats.curve[1]).toBe(5); // Sol Ring + 4x Lightning Bolt at CMC 1
    expect(stats.curve[4]).toBe(1); // Wrath of God at CMC 4
    expect(stats.totalCards).toBe(6);
  });

  it('skips lands in CMC calculation', () => {
    const cards = [
      makeDeckCard({ card_name: 'Island', quantity: 10, category: 'Lands' }),
      makeDeckCard({ card_name: 'Sol Ring', quantity: 1 }),
    ];
    const cache = new Map<string, ScryfallCard>([
      ['Island', makeScryfallCard({ name: 'Island', cmc: 0, type_line: 'Basic Land — Island' })],
      ['Sol Ring', makeScryfallCard({ name: 'Sol Ring', cmc: 1 })],
    ]);
    const stats = computeStats(cards, cache, 100);
    expect(stats.avgCmc).toBe('1.00');
    expect(stats.curve[0]).toBe(0); // lands not counted
    expect(stats.curve[1]).toBe(1); // only Sol Ring
  });

  it('computes color distribution', () => {
    const cards = [
      makeDeckCard({ card_name: 'Lightning Bolt', quantity: 3 }),
      makeDeckCard({ card_name: 'Counterspell', quantity: 2 }),
      makeDeckCard({ card_name: 'Sol Ring', quantity: 1 }),
    ];
    const cache = new Map<string, ScryfallCard>([
      ['Lightning Bolt', makeScryfallCard({ name: 'Lightning Bolt', cmc: 1, color_identity: ['R'] })],
      ['Counterspell', makeScryfallCard({ name: 'Counterspell', cmc: 2, color_identity: ['U'] })],
      ['Sol Ring', makeScryfallCard({ name: 'Sol Ring', cmc: 1, color_identity: [] })],
    ]);
    const stats = computeStats(cards, cache, 60);
    expect(stats.colorCounts['R']).toBe(3);
    expect(stats.colorCounts['U']).toBe(2);
    expect(stats.colorCounts['C']).toBe(1); // colorless non-land
  });

  it('computes total price', () => {
    const cards = [
      makeDeckCard({ card_name: 'Sol Ring', quantity: 1 }),
      makeDeckCard({ card_name: 'Mana Crypt', quantity: 1 }),
    ];
    const cache = new Map<string, ScryfallCard>([
      ['Sol Ring', makeScryfallCard({ name: 'Sol Ring', cmc: 1, prices: { usd: '3.50' } })],
      ['Mana Crypt', makeScryfallCard({ name: 'Mana Crypt', cmc: 0, prices: { usd: '150.00' } })],
    ]);
    const stats = computeStats(cards, cache, 100);
    expect(stats.totalPrice).toBeCloseTo(153.50);
    expect(stats.priceCount).toBe(2);
  });

  it('handles cards with quantity > 1 in price', () => {
    const cards = [makeDeckCard({ card_name: 'Lightning Bolt', quantity: 4 })];
    const cache = new Map<string, ScryfallCard>([
      ['Lightning Bolt', makeScryfallCard({ name: 'Lightning Bolt', cmc: 1, color_identity: ['R'], prices: { usd: '1.00' } })],
    ]);
    const stats = computeStats(cards, cache, 60);
    expect(stats.totalPrice).toBeCloseTo(4.00);
  });

  it('buckets CMC 7+ into the last bucket', () => {
    const cards = [makeDeckCard({ card_name: 'Omniscience', quantity: 1 })];
    const cache = new Map<string, ScryfallCard>([
      ['Omniscience', makeScryfallCard({ name: 'Omniscience', cmc: 10, color_identity: ['U'] })],
    ]);
    const stats = computeStats(cards, cache, 100);
    expect(stats.curve[7]).toBe(1);
  });

  it('averages CMC correctly with mixed costs', () => {
    const cards = [
      makeDeckCard({ card_name: 'A', quantity: 2 }),
      makeDeckCard({ card_name: 'B', quantity: 1 }),
    ];
    const cache = new Map<string, ScryfallCard>([
      ['A', makeScryfallCard({ name: 'A', cmc: 2 })],
      ['B', makeScryfallCard({ name: 'B', cmc: 5 })],
    ]);
    const stats = computeStats(cards, cache, 60);
    // (2*2 + 5*1) / 3 = 9/3 = 3.00
    expect(stats.avgCmc).toBe('3.00');
  });
});
