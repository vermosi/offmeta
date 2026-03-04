/**
 * Tests for scryfall/localized module.
 * Covers all locale fallback branches.
 * @module lib/scryfall/__tests__/localized.test
 */

import { describe, it, expect } from 'vitest';
import { getLocalizedName, getLocalizedTypeLine, getLocalizedOracleText } from '../localized';
import type { ScryfallCard } from '@/types/card';

const buildCard = (overrides: Partial<ScryfallCard> = {}): ScryfallCard => ({
  id: 'id',
  name: 'Lightning Bolt',
  cmc: 1,
  type_line: 'Instant',
  oracle_text: 'Lightning Bolt deals 3 damage to any target.',
  color_identity: ['R'],
  set: 'lea',
  set_name: 'Alpha',
  rarity: 'common',
  prices: {},
  legalities: {},
  scryfall_uri: 'https://scryfall.com/card/lea/1',
  ...overrides,
});

describe('getLocalizedName', () => {
  it('returns English name when locale is en', () => {
    const card = buildCard({ printed_name: 'Éclair' });
    expect(getLocalizedName(card, 'en')).toBe('Lightning Bolt');
  });

  it('returns printed_name for non-English locale', () => {
    const card = buildCard({ printed_name: 'Éclair' });
    expect(getLocalizedName(card, 'fr')).toBe('Éclair');
  });

  it('falls back to English name when no printed_name', () => {
    const card = buildCard();
    expect(getLocalizedName(card, 'de')).toBe('Lightning Bolt');
  });
});

describe('getLocalizedTypeLine', () => {
  it('returns English type line when locale is en', () => {
    const card = buildCard({ printed_type_line: 'Rituel' });
    expect(getLocalizedTypeLine(card, 'en')).toBe('Instant');
  });

  it('returns printed_type_line for non-English locale', () => {
    const card = buildCard({ printed_type_line: 'Rituel' });
    expect(getLocalizedTypeLine(card, 'fr')).toBe('Rituel');
  });

  it('falls back to English type line when no printed_type_line', () => {
    const card = buildCard();
    expect(getLocalizedTypeLine(card, 'ja')).toBe('Instant');
  });
});

describe('getLocalizedOracleText', () => {
  it('returns English oracle text when locale is en', () => {
    const card = buildCard({ printed_text: 'Texte français' });
    expect(getLocalizedOracleText(card, 'en')).toBe('Lightning Bolt deals 3 damage to any target.');
  });

  it('returns printed_text for non-English locale', () => {
    const card = buildCard({ printed_text: 'Texte français' });
    expect(getLocalizedOracleText(card, 'fr')).toBe('Texte français');
  });

  it('falls back to English oracle text when no printed_text', () => {
    const card = buildCard();
    expect(getLocalizedOracleText(card, 'es')).toBe('Lightning Bolt deals 3 damage to any target.');
  });

  it('returns undefined when no oracle text at all', () => {
    const card = buildCard({ oracle_text: undefined });
    expect(getLocalizedOracleText(card, 'en')).toBeUndefined();
  });
});
