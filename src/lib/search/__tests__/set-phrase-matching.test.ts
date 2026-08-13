import { describe, expect, it } from 'vitest';
import { matchSetPhrase } from '../../../../supabase/functions/_shared/setMatching';
import { buildDeterministicIntent } from '../../../../supabase/functions/semantic-search/deterministic/index';

describe('matchSetPhrase', () => {
  it('splits set name from card criteria', () => {
    const m = matchSetPhrase('the hobbit red dwarf');
    expect(m?.query).toContain('e:hob');
    expect(m?.remainder).toBe('red dwarf');
  });
  it('builds combined query', () => {
    const { deterministicQuery } = buildDeterministicIntent('the hobbit red dwarf');
    console.log(deterministicQuery);
    expect(deterministicQuery).toContain('e:hob');
    expect(deterministicQuery).toMatch(/dwarf/i);
  });
  it('does not hijack functional terms', () => {
    expect(matchSetPhrase('red dwarf commander')).toBeNull();
    expect(matchSetPhrase('treasure token creatures')).toBeNull();
    expect(matchSetPhrase('cheap red removal')).toBeNull();
  });
});
