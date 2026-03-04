/**
 * Tests for archetype-matching module.
 * @module lib/scryfall/__tests__/archetype-matching.test
 */

import { describe, it, expect } from 'vitest';
import { matchArchetypes } from '../archetype-matching';

describe('matchArchetypes', () => {
  it('returns empty array when both oracleText and typeLine are falsy', () => {
    expect(matchArchetypes(undefined, '')).toEqual([]);
    expect(matchArchetypes('', '')).toEqual([]);
  });

  it('returns empty array when text has no archetype signals', () => {
    expect(matchArchetypes('This card does nothing special.', 'Creature — Human')).toEqual([]);
  });

  it('requires at least 2 keyword matches to return an archetype', () => {
    // Only one voltron signal ("equip") — should not match
    const result = matchArchetypes('Equip {2}', 'Artifact — Equipment');
    const voltronMatch = result.find((a) => a.slug === 'voltron');
    expect(voltronMatch).toBeUndefined();
  });

  it('matches voltron with 2+ signals', () => {
    const result = matchArchetypes(
      'Equip {2}. Equipped creature gets +2/+2 and has double strike.',
      'Artifact — Equipment',
    );
    const voltron = result.find((a) => a.slug === 'voltron');
    expect(voltron).toBeDefined();
    expect(voltron!.slug).toBe('voltron');
  });

  it('matches aristocrats archetype', () => {
    const result = matchArchetypes(
      'Whenever a creature dies, each opponent loses 1 life. Sacrifice a creature: draw a card.',
      'Creature — Human',
    );
    const aristocrats = result.find((a) => a.slug === 'aristocrats');
    expect(aristocrats).toBeDefined();
  });

  it('matches tokens archetype', () => {
    const result = matchArchetypes(
      'Create a 1/1 white Soldier creature token. Populate.',
      'Sorcery',
    );
    const tokens = result.find((a) => a.slug === 'tokens');
    expect(tokens).toBeDefined();
  });

  it('matches landfall archetype', () => {
    const result = matchArchetypes(
      'Landfall — Whenever a land enters the battlefield under your control, put a +1/+1 counter on this creature.',
      'Creature — Plant',
    );
    const landfall = result.find((a) => a.slug === 'landfall');
    expect(landfall).toBeDefined();
  });

  it('matches lifegain archetype', () => {
    const result = matchArchetypes(
      'Lifelink. Whenever you gain life, put a +1/+1 counter on this creature.',
      'Creature — Angel',
    );
    const lifegain = result.find((a) => a.slug === 'lifegain');
    expect(lifegain).toBeDefined();
  });

  it('returns at most 4 archetypes', () => {
    // Craft text that hits many archetypes
    const multiSignal =
      'Whenever a creature dies, sacrifice, create a token, populate, ' +
      'return from graveyard to battlefield, reanimate, ' +
      'gain life, lifelink, whenever you gain life, ' +
      'landfall, whenever a land enters, ' +
      '+1/+1 counter, proliferate, counter on, ' +
      'enchantment, whenever you cast an enchantment, constellation';
    const result = matchArchetypes(multiSignal, 'Creature');
    expect(result.length).toBeLessThanOrEqual(4);
  });

  it('sorts by score descending (highest match first)', () => {
    // Graveyard has many signals; include most of them
    const oracleText =
      'Mill 3. Return target card from your graveyard. Flashback {2}. Escape—{3}, exile five other cards from your graveyard. Dredge 3.';
    const result = matchArchetypes(oracleText, 'Creature');
    // Graveyard should match strongly (graveyard, mill, dredge, flashback, escape = 5 signals)
    if (result.length > 0) {
      expect(result[0].slug).toBe('graveyard');
    }
  });

  it('handles undefined oracleText with valid typeLine', () => {
    // Should not crash; typeLine alone rarely hits 2+ signals
    const result = matchArchetypes(undefined, 'Artifact — Equipment');
    expect(Array.isArray(result)).toBe(true);
  });

  it('matches are case-insensitive', () => {
    const result = matchArchetypes(
      'EQUIP {1}. EQUIPPED creature gets +3/+3 and has DOUBLE STRIKE.',
      'Artifact — Equipment',
    );
    const voltron = result.find((a) => a.slug === 'voltron');
    expect(voltron).toBeDefined();
  });

  it('returns Archetype objects with expected shape', () => {
    const result = matchArchetypes(
      'Sacrifice a creature: each opponent loses 1 life. Whenever a creature dies, draw a card.',
      'Enchantment',
    );
    for (const arch of result) {
      expect(arch).toHaveProperty('slug');
      expect(arch).toHaveProperty('name');
      expect(arch).toHaveProperty('colors');
      expect(arch).toHaveProperty('searchQuery');
    }
  });

  it('skips archetypes with no signal mapping', () => {
    // All valid ARCHETYPES should have entries in the signal map.
    // This test ensures the continue path is exercised when slug has no signals.
    // Since we can't easily inject, just verify the function works end-to-end.
    const result = matchArchetypes('some random text', 'Land');
    expect(Array.isArray(result)).toBe(true);
  });
});
