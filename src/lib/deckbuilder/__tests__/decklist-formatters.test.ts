import { describe, it, expect } from 'vitest';
import {
  buildDecklistText,
  buildArenaText,
  buildMtgoText,
} from '../decklist-formatters';
import type { DeckCard, Deck } from '@/hooks/useDeck';

function makeCard(name: string, overrides?: Partial<DeckCard>): DeckCard {
  return {
    id: name,
    deck_id: 'deck-1',
    card_name: name,
    quantity: 1,
    board: 'mainboard',
    is_commander: false,
    is_companion: false,
    category: 'Creatures',
    scryfall_id: null,
    created_at: '',
    ...overrides,
  };
}

const deck: Deck = {
  id: 'deck-1',
  user_id: 'user-1',
  name: 'Test Deck',
  format: 'commander',
  description: null,
  card_count: 0,
  color_identity: [],
  commander_name: null,
  companion_name: null,
  is_public: false,
  created_at: '',
  updated_at: '',
};

describe('buildDecklistText', () => {
  it('groups mainboard cards by category', () => {
    const cards = [
      makeCard('Sol Ring', { category: 'Artifacts' }),
      makeCard('Forest', { category: 'Lands' }),
    ];
    const text = buildDecklistText(deck, cards);
    expect(text).toContain('// Artifacts');
    expect(text).toContain('1 Sol Ring');
    expect(text).toContain('// Lands');
    expect(text).toContain('1 Forest');
  });

  it('includes commander section', () => {
    const cards = [makeCard('Atraxa', { is_commander: true })];
    const text = buildDecklistText(deck, cards);
    expect(text).toContain('COMMANDER: Atraxa');
  });

  it('includes companion section', () => {
    const cards = [makeCard('Lurrus', { is_companion: true })];
    const text = buildDecklistText(deck, cards);
    expect(text).toContain('COMPANION: Lurrus');
  });

  it('includes sideboard section', () => {
    const cards = [makeCard('Negate', { board: 'sideboard' })];
    const text = buildDecklistText(deck, cards);
    expect(text).toContain('// Sideboard');
    expect(text).toContain('1 Negate');
  });

  it('excludes maybeboard cards', () => {
    const cards = [makeCard('Maybe Card', { board: 'maybeboard' })];
    const text = buildDecklistText(deck, cards);
    expect(text).not.toContain('Maybe Card');
  });
});

describe('buildArenaText', () => {
  it('formats cards in Arena style', () => {
    const cards = [makeCard('Lightning Bolt')];
    const text = buildArenaText(cards);
    expect(text).toContain('Deck');
    expect(text).toContain('1 Lightning Bolt');
  });

  it('includes Commander header', () => {
    const cards = [makeCard('Kenrith', { is_commander: true })];
    const text = buildArenaText(cards);
    expect(text).toContain('Commander');
  });

  it('includes Sideboard section', () => {
    const cards = [makeCard('Duress', { board: 'sideboard' })];
    const text = buildArenaText(cards);
    expect(text).toContain('Sideboard');
  });
});

describe('buildMtgoText', () => {
  it('formats mainboard cards', () => {
    const cards = [makeCard('Brainstorm')];
    const text = buildMtgoText(cards);
    expect(text).toContain('1 Brainstorm');
  });

  it('prefixes sideboard with SB:', () => {
    const cards = [makeCard('Pyroblast', { board: 'sideboard' })];
    const text = buildMtgoText(cards);
    expect(text).toContain('SB: 1 Pyroblast');
  });

  it('includes commanders in mainboard', () => {
    const cards = [
      makeCard('Urza', { is_commander: true }),
      makeCard('Sol Ring'),
    ];
    const text = buildMtgoText(cards);
    expect(text).toContain('1 Urza');
    expect(text).toContain('1 Sol Ring');
  });
});
