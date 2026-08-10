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

describe('normalizeCardSlug', () => {
  it('normalizes case, underscores, and stray hyphens', async () => {
    const { normalizeCardSlug } = await import('../card-slug');
    expect(normalizeCardSlug('Sol_Ring')).toBe('sol-ring');
    expect(normalizeCardSlug('-sol--ring-')).toBe('sol-ring');
    expect(normalizeCardSlug('Sol Ring')).toBe('sol-ring');
  });

  it('decodes percent-encoding and strips punctuation', async () => {
    const { normalizeCardSlug } = await import('../card-slug');
    expect(normalizeCardSlug("Sensei%27s-Divining-Top")).toBe('senseis-divining-top');
    expect(normalizeCardSlug('seance.html')).toBe('seance');
  });

  it('is idempotent for already-canonical slugs', async () => {
    const { normalizeCardSlug } = await import('../card-slug');
    expect(normalizeCardSlug('swords-to-plowshares')).toBe('swords-to-plowshares');
  });
});

describe('slugNameCandidates', () => {
  it('returns progressively shorter candidates', async () => {
    const { slugNameCandidates } = await import('../card-slug');
    expect(slugNameCandidates('sol-ring-mtg-card')).toEqual([
      'Sol Ring Mtg Card',
      'Sol Ring Mtg',
      'Sol Ring',
    ]);
  });

  it('returns an empty list for empty slugs', async () => {
    const { slugNameCandidates } = await import('../card-slug');
    expect(slugNameCandidates('---')).toEqual([]);
  });
});
