import { describe, it, expect } from 'vitest';
import { inferCategory, DEFAULT_CATEGORY } from '../infer-category';
import type { ScryfallCard } from '@/types/card';

function makeCard(type_line: string): ScryfallCard {
  return { type_line } as unknown as ScryfallCard;
}

describe('inferCategory', () => {
  it('returns Lands for land cards', () => {
    expect(inferCategory(makeCard('Basic Land — Forest'))).toBe('Lands');
  });

  it('returns Creatures for creature cards', () => {
    expect(inferCategory(makeCard('Creature — Elf Warrior'))).toBe('Creatures');
  });

  it('returns Instants for instant cards', () => {
    expect(inferCategory(makeCard('Instant'))).toBe('Instants');
  });

  it('returns Sorceries for sorcery cards', () => {
    expect(inferCategory(makeCard('Sorcery'))).toBe('Sorceries');
  });

  it('returns Artifacts for artifact cards', () => {
    expect(inferCategory(makeCard('Artifact — Equipment'))).toBe('Artifacts');
  });

  it('returns Enchantments for enchantment cards', () => {
    expect(inferCategory(makeCard('Enchantment — Aura'))).toBe('Enchantments');
  });

  it('returns Planeswalkers for planeswalker cards', () => {
    expect(inferCategory(makeCard('Legendary Planeswalker — Jace'))).toBe('Planeswalkers');
  });

  it('returns Other for unknown types', () => {
    expect(inferCategory(makeCard('Conspiracy'))).toBe(DEFAULT_CATEGORY);
  });

  it('handles missing type_line', () => {
    expect(inferCategory(makeCard(''))).toBe(DEFAULT_CATEGORY);
  });

  it('is case-insensitive', () => {
    expect(inferCategory(makeCard('CREATURE — Dragon'))).toBe('Creatures');
  });

  it('prioritizes land over creature for Dryad Arbor-style types', () => {
    expect(inferCategory(makeCard('Land Creature — Forest Dryad'))).toBe('Lands');
  });
});
