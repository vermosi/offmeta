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
