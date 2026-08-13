import { describe, expect, it } from 'vitest';
import { matchSetQuery } from '../../../../supabase/functions/_shared/setMatching';
import { buildDeterministicIntent } from '../../../../supabase/functions/semantic-search/deterministic/index';

describe('matchSetQuery', () => {
  it('resolves an upcoming set by name, including its supplemental products', () => {
    const match = matchSetQuery('hobbit');
    expect(match?.reason).toBe('exact-name');
    expect(match?.query).toContain('e:hob');
    expect(match?.query).toContain('e:hoc');
  });

  it('ignores filler words around the set name', () => {
    for (const query of ['the hobbit', 'The Hobbit set', 'hobbit cards', 'the hobbit spoilers']) {
      expect(matchSetQuery(query)?.query).toBe(matchSetQuery('hobbit')?.query);
    }
  });

  it('resolves a bare set code', () => {
    const match = matchSetQuery('hoc');
    expect(match?.reason).toBe('exact-code');
    expect(match?.query).toBe('e:hoc');
  });

  it('never matches partial or card-level queries', () => {
    expect(matchSetQuery('frodo adventurous hobbit')).toBeNull();
    expect(matchSetQuery('hobbit hole')).toBeNull();
    expect(matchSetQuery('cheap red treasure cards')).toBeNull();
  });

  it('does not treat ambiguous English words as set codes', () => {
    expect(matchSetQuery('war')).toBeNull();
    expect(matchSetQuery('one')).toBeNull();
  });
});

describe('deterministic translation of set queries', () => {
  it('prefers the set query over a name: search', () => {
    const { deterministicQuery } = buildDeterministicIntent('hobbit');
    expect(deterministicQuery).toContain('e:hob');
    expect(deterministicQuery).not.toContain('name:');
  });

  it('still resolves real card names to name searches', () => {
    const { deterministicQuery } = buildDeterministicIntent('lightning bolt');
    expect(deterministicQuery).toContain('name:');
  });
});
