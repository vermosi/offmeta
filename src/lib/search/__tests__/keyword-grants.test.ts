import { describe, expect, it } from 'vitest';
import { buildDeterministicIntent } from '../../../../supabase/functions/semantic-search/deterministic/index';

const build = (query: string) => buildDeterministicIntent(query).deterministicQuery;

describe('granted keyword parsing', () => {
  it('treats "gives your creatures indestructible" as a grant, not kw:', () => {
    const q = build(
      'anthem in boros color identity that gives your creatures indestructible',
    );
    expect(q).toContain('id<=rw');
    expect(q).toContain('o:"gain indestructible"');
    expect(q).toContain('o:"you control"');
    expect(q).not.toContain('kw:indestructible');
    // The generic anthem tag would exclude one-shot protection spells.
    expect(q).not.toContain('otag:anthem');
  });

  it('handles "my creatures" phrasing for other keywords', () => {
    const q = build('cards that give my creatures hexproof');
    expect(q).toContain('o:"gain hexproof"');
    expect(q).toContain('o:"you control"');
    expect(q).not.toContain('kw:hexproof');
  });

  it('does not affect cards that simply have the keyword', () => {
    expect(build('creatures with indestructible')).toContain('kw:indestructible');
  });

  it('keeps the anthem tag when no grant phrasing is present', () => {
    expect(build('boros anthem effects')).toContain('otag:anthem');
  });
});
