import { describe, it, expect } from 'vitest';

import {
  matchArtTagQuery,
  isLikelyArtTagQuery,
} from '../../../../supabase/functions/_shared/artTagMatching';

describe('matchArtTagQuery', () => {
  it('resolves a bare art-tag query', () => {
    expect(matchArtTagQuery('shirtless cards')?.query).toBe('atag:shirtless');
    expect(matchArtTagQuery('shirtless')?.query).toBe('atag:shirtless');
  });

  it('ignores filler words and explicit art phrasing', () => {
    expect(matchArtTagQuery('cards with shirtless art')?.query).toBe(
      'atag:shirtless',
    );
    expect(matchArtTagQuery('show me shirtless artwork')?.query).toBe(
      'atag:shirtless',
    );
  });

  it('never hijacks type or mechanic words', () => {
    expect(matchArtTagQuery('dragon')).toBeNull();
    expect(matchArtTagQuery('treasure cards')).toBeNull();
    expect(matchArtTagQuery('goblin')).toBeNull();
  });

  it('returns null for unknown terms and short input', () => {
    expect(matchArtTagQuery('cards that punish treasure decks')).toBeNull();
    expect(matchArtTagQuery('xyzzy cards')).toBeNull();
    expect(matchArtTagQuery('ab')).toBeNull();
  });

  it('exposes a boolean helper', () => {
    expect(isLikelyArtTagQuery('shirtless cards')).toBe(true);
    expect(isLikelyArtTagQuery('draw two cards')).toBe(false);
  });
});

describe('casing and pluralization normalization', () => {
  it('resolves the same tag regardless of casing or separators', () => {
    const expected = 'atag:shirtless';
    for (const q of ['shirtless cards', 'Shirtless', 'SHIRTLESS CARDS', 'shirtless-cards', '  Shirtless  Cards  ']) {
      expect(matchArtTagQuery(q)?.query).toBe(expected);
    }
  });

  it('still rejects reserved terms in plural form', () => {
    expect(matchArtTagQuery('dragons')).toBeNull();
    expect(matchArtTagQuery('treasures')).toBeNull();
  });
});

describe('never hijacks type or mechanic terms', () => {
  const RESERVED_QUERIES = [
    'dragon',
    'dragons',
    'dragon cards',
    'red dragon',
    'treasure',
    'treasures',
    'treasure tokens',
    'goblin',
    'goblins',
    'angel cards',
    'vampire tribal',
    'zombie tokens',
    'wolf pack',
    'wizards',
    'knight creatures',
    'human soldiers',
    'sacrifice outlets',
    'artifact cards',
    'lands',
    'mountains',
    'snakes',
    'spiders',
    'cat tokens',
    'dog cards',
    'bird creatures',
    'beast cards',
    'demon cards',
    'elf tribal',
  ];

  it.each(RESERVED_QUERIES)('returns null for %s', (query) => {
    expect(matchArtTagQuery(query)).toBeNull();
    expect(isLikelyArtTagQuery(query)).toBe(false);
  });

  it('returns null for common non-art search phrasing', () => {
    expect(matchArtTagQuery('draw two cards')).toBeNull();
    expect(matchArtTagQuery('counterspells under $5')).toBeNull();
    expect(matchArtTagQuery('cards that punish treasure decks')).toBeNull();
  });

  it('still matches genuine art vocabulary alongside the guards', () => {
    expect(matchArtTagQuery('shirtless cards')?.query).toBe('atag:shirtless');
    expect(matchArtTagQuery('shirtless artwork')?.query).toBe('atag:shirtless');
  });
});

describe('subtype words are never art tags', () => {
  it('keeps creature types as type searches', () => {
    expect(matchArtTagQuery('cards that are heroes')).toBeNull();
    expect(matchArtTagQuery('heroes')).toBeNull();
    expect(isLikelyArtTagQuery('monkey cards')).toBe(false);
  });
});
