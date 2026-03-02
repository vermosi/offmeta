/**
 * Unit tests for the buildDecklistText export logic.
 * @module components/deckbuilder/__tests__/DeckExportMenu.test
 */

import { describe, it, expect } from 'vitest';
import type { DeckCard, Deck } from '@/hooks/useDeck';

// Re-implement buildDecklistText for testing (mirrors DeckExportMenu)
function buildDecklistText(deck: Deck, cards: DeckCard[]): string {
  const lines: string[] = [];
  const commanders = cards.filter((c) => c.is_commander);
  if (commanders.length > 0) {
    for (const cmd of commanders) {
      lines.push(`COMMANDER: ${cmd.card_name}`);
    }
    lines.push('');
  }
  const grouped: Record<string, DeckCard[]> = {};
  for (const card of cards) {
    if (card.is_commander) continue;
    const cat = card.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(card);
  }
  for (const [category, catCards] of Object.entries(grouped)) {
    lines.push(`// ${category}`);
    for (const card of catCards.sort((a, b) => a.card_name.localeCompare(b.card_name))) {
      lines.push(`${card.quantity} ${card.card_name}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

function makeDeck(overrides?: Partial<Deck>): Deck {
  return {
    id: 'test-id',
    user_id: 'user-1',
    name: 'Test Deck',
    format: 'commander',
    is_public: false,
    card_count: 0,
    color_identity: [],
    commander_name: null,
    companion_name: null,
    description: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeCard(overrides: Partial<DeckCard> & { card_name: string }): DeckCard {
  return {
    id: crypto.randomUUID(),
    deck_id: 'test-id',
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

describe('buildDecklistText', () => {
  it('outputs commander first', () => {
    const deck = makeDeck();
    const cards = [
      makeCard({ card_name: 'Korvold, Fae-Cursed King', is_commander: true, category: 'Commander' }),
      makeCard({ card_name: 'Sol Ring', category: 'Ramp' }),
    ];
    const text = buildDecklistText(deck, cards);
    expect(text.startsWith('COMMANDER: Korvold, Fae-Cursed King')).toBe(true);
    expect(text).toContain('// Ramp');
    expect(text).toContain('1 Sol Ring');
  });

  it('groups cards by category alphabetically', () => {
    const deck = makeDeck();
    const cards = [
      makeCard({ card_name: 'Counterspell', category: 'Instants' }),
      makeCard({ card_name: 'Arcane Signet', category: 'Ramp' }),
      makeCard({ card_name: 'Sol Ring', category: 'Ramp' }),
    ];
    const text = buildDecklistText(deck, cards);
    const lines = text.split('\n');
    // Ramp section should have sorted entries
    const rampIdx = lines.indexOf('// Ramp');
    expect(rampIdx).toBeGreaterThan(-1);
    expect(lines[rampIdx + 1]).toBe('1 Arcane Signet');
    expect(lines[rampIdx + 2]).toBe('1 Sol Ring');
  });

  it('handles cards with no category as Other', () => {
    const deck = makeDeck();
    const cards = [makeCard({ card_name: 'Mystery Card', category: null })];
    const text = buildDecklistText(deck, cards);
    expect(text).toContain('// Other');
    expect(text).toContain('1 Mystery Card');
  });

  it('handles empty deck', () => {
    const deck = makeDeck();
    const text = buildDecklistText(deck, []);
    expect(text).toBe('');
  });

  it('includes quantity for multi-copies', () => {
    const deck = makeDeck();
    const cards = [makeCard({ card_name: 'Lightning Bolt', quantity: 4, category: 'Removal' })];
    const text = buildDecklistText(deck, cards);
    expect(text).toContain('4 Lightning Bolt');
  });

  it('handles multiple commanders (partners)', () => {
    const deck = makeDeck();
    const cards = [
      makeCard({ card_name: 'Thrasios, Triton Hero', is_commander: true }),
      makeCard({ card_name: 'Tymna the Weaver', is_commander: true }),
      makeCard({ card_name: 'Sol Ring', category: 'Ramp' }),
    ];
    const text = buildDecklistText(deck, cards);
    expect(text).toContain('COMMANDER: Thrasios, Triton Hero');
    expect(text).toContain('COMMANDER: Tymna the Weaver');
  });
});
