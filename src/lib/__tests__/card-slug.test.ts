import { describe, it, expect } from 'vitest';
import { cardNameToSlug, slugToCardName } from '../card-slug';

describe('cardNameToSlug', () => {
  it('converts simple names', () => {
    expect(cardNameToSlug('Sol Ring')).toBe('sol-ring');
  });

  it('handles apostrophes', () => {
    expect(cardNameToSlug("Sensei's Divining Top")).toBe('senseis-divining-top');
  });

  it('handles special characters', () => {
    expect(cardNameToSlug('Æther Vial')).toBe('ther-vial');
  });

  it('handles multi-word names', () => {
    expect(cardNameToSlug('Swords to Plowshares')).toBe('swords-to-plowshares');
  });
});

describe('slugToCardName', () => {
  it('converts slugs to title case', () => {
    expect(slugToCardName('sol-ring')).toBe('Sol Ring');
  });

  it('converts multi-word slugs', () => {
    expect(slugToCardName('swords-to-plowshares')).toBe('Swords To Plowshares');
  });
});
