/**
 * Regression tests for strategy-hate / hoser phrase compilation in the
 * client-side fallback translator. These phrases MUST match before generic
 * SLANG_MAP tokens so that e.g. "punish treasure decks" doesn't collapse
 * into a naive o:"treasure" query.
 */

import { describe, it, expect } from 'vitest';
import { buildClientFallbackQuery } from '../fallback';

describe('buildClientFallbackQuery — strategy hate patterns', () => {
  it('translates "cards that punish treasure decks" to artifact hate', () => {
    const q = buildClientFallbackQuery('cards that punish treasure decks');
    expect(q).toContain('otag:artifact-removal');
    expect(q).toContain('activated abilities of artifacts');
    // Should NOT collapse to naive treasure slang
    expect(q).not.toMatch(/^o:"treasure"$/);
  });

  it.each([
    'cards that punish treasure decks',
    'cards that hose treasure decks',
    'cards that stop artifact decks',
    'cards that shut down affinity decks',
  ])('artifact hate phrase: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toContain('otag:artifact-removal');
  });

  it.each([
    'cards that punish graveyard decks',
    'cards that hate reanimator decks',
    'cards that stop dredge decks',
    'cards that shut down mill decks',
  ])('graveyard hate phrase: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/otag:graveyard-hate|exile.*graveyard/);
  });

  it.each([
    'cards that punish storm decks',
    'cards that hate combo decks',
    'cards that stop spellslinger decks',
  ])('storm/combo hate phrase: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/can't cast more than|otag:hatebear|spells cost/);
  });

  it('translates "cards that punish token decks" to token hate', () => {
    const q = buildClientFallbackQuery('cards that punish token decks');
    expect(q).toMatch(/token|creatures your opponents control/i);
    expect(q).not.toBe('o:"token"');
  });

  it.each([
    'cards that punish lifegain decks',
    'cards that hate life gain decks',
  ])('lifegain hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q.length).toBeGreaterThan(0);
    expect(q).not.toMatch(/^o:"life(gain)?"$/);
  });

  it('translates "cards that punish ramp decks" to ramp hate', () => {
    const q = buildClientFallbackQuery('cards that punish ramp decks');
    expect(q).toMatch(/can't search|can't play additional lands|skip.*land|otag:hatebear/);
  });

  it('translates "cards that hate tutor decks" to tutor hate', () => {
    const q = buildClientFallbackQuery('cards that hate tutor decks');
    expect(q).toMatch(/can't search|otag:hatebear/);
  });

  it.each([
    'cards that punish card draw decks',
    'cards that hate draw decks',
    'cards that stop wheel decks',
  ])('draw hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/opponent.*draws|skip.*draw|can't draw more than|otag:hatebear/);
  });

  it.each([
    'cards that punish aggro decks',
    'cards that hate go-wide decks',
    'cards that stop weenie decks',
  ])('aggro/go-wide hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q.length).toBeGreaterThan(0);
    expect(q).not.toMatch(/^o:"(aggro|weenie|swarm)"$/);
  });

  it('translates "cards that punish enchantment decks" to enchantment hate', () => {
    const q = buildClientFallbackQuery('cards that punish enchantment decks');
    expect(q).toMatch(/enchantment|otag:enchantment-removal/i);
    expect(q).not.toBe('o:"enchantment"');
  });

  it.each([
    'cards that punish control decks',
    'cards that hate counterspell decks',
    'cards that stop permission decks',
  ])('control/counter hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/can't be countered|opponent.*counters|otag:hatebear/);
  });

  it('runs hate patterns before generic slang (order sensitivity)', () => {
    // "treasure" alone should hit slang, but "punish treasure decks"
    // must resolve to hate first.
    const naive = buildClientFallbackQuery('treasure');
    const hate = buildClientFallbackQuery('cards that punish treasure decks');
    expect(hate).not.toEqual(naive);
    expect(hate).toContain('otag:artifact-removal');
  });
});

describe('buildClientFallbackQuery — extended archetype hate patterns', () => {
  it.each([
    'cards that punish planeswalker decks',
    'cards that hate superfriends decks',
  ])('planeswalker hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/destroy target planeswalker|otag:planeswalker-removal|planeswalker/);
  });

  it.each([
    'cards that punish hand decks',
    'cards that hate discard decks',
    'cards that stop 8-rack decks',
  ])('discard/hand hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/otag:discard|discards a card|maximum hand size|reveal your hand/);
  });

  it.each([
    'cards that punish flying decks',
    'cards that hate dragon decks',
    'cards that stop angel decks',
  ])('flying/evasion hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/flying|creatures with flying/);
  });

  it.each([
    'cards that punish elf decks',
    'cards that hate goblin decks',
    'cards that stop zombie decks',
    'cards that shut down merfolk decks',
  ])('tribal hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/otag:boardwipe|destroy all creatures|protection from/);
  });

  it.each([
    'cards that punish eldrazi decks',
    'cards that hate big mana decks',
    'cards that stop reanimate decks',
  ])('big-mana/cheat hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/can't be cast|put onto the battlefield|otag:stax|otag:hatebear/);
  });

  it.each([
    'cards that punish infect decks',
    'cards that hate poison decks',
    'cards that stop proliferate decks',
  ])('infect/poison hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/poison|prevent all damage/);
  });

  it.each([
    'cards that punish voltron decks',
    'cards that hate equipment decks',
    'cards that stop aura decks',
  ])('voltron/equipment/aura hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/destroy target equipment|destroy all equipment|destroy all auras|equipment/);
  });

  it.each([
    'cards that punish aristocrats decks',
    'cards that hate sacrifice decks',
  ])('aristocrats/sacrifice hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/can't be sacrificed|exile it instead|leyline of the void/);
  });

  it.each([
    'cards that punish blink decks',
    'cards that hate flicker decks',
    'cards that stop etb decks',
  ])('blink/flicker/etb hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/enter the battlefield|can't enter the battlefield|otag:stax/);
  });

  it.each([
    'cards that punish landfall decks',
    'cards that hate lands-matter decks',
  ])('landfall/lands hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/destroy target land|can't play additional lands|otag:land-destruction/);
  });

  it.each([
    'cards that punish extra turns decks',
    'cards that hate group hug decks',
  ])('extra-turns/group-hug hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/can't take extra turns|skip.*turn|can't draw more than/);
  });

  it.each([
    'cards that punish stax decks',
    'cards that hate prison decks',
    'cards that stop mld decks',
  ])('stax/prison hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/destroy all.*artifacts|destroy all.*enchantments|otag:(enchantment|artifact)-removal/);
  });

  it.each([
    'cards that punish enchantress decks',
    'cards that hate bogles decks',
  ])('enchantress/bogles hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/otag:enchantment-removal|destroy all enchantments|exile all enchantments/);
  });

  it.each([
    'cards that punish +1/+1 counter decks',
    'cards that hate counters decks',
  ])('counters/+1/+1 hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/remove all counters|can't have counters|counters can't be put/);
  });

  it.each([
    'cards that punish madness decks',
    'cards that hate cycling decks',
  ])('madness/cycling hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/exile it instead|otag:graveyard-hate/);
  });
});
