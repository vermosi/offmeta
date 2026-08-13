import { describe, it, expect } from 'vitest';
import {
  buildWhyItMatches,
  detectMethod,
  detectRole,
  deriveConcept,
  intentFromScryfallQuery,
} from './whyItMatches';
import type { ScryfallCard } from '@/types/card';
import type { SearchIntent } from '@/types/search';

function makeCard(overrides: Partial<ScryfallCard>): ScryfallCard {
  return {
    id: 'test-id',
    name: 'Test Card',
    type_line: 'Creature — Human',
    oracle_text: '',
    cmc: 2,
    colors: ['R'],
    color_identity: ['R'],
    ...overrides,
  } as ScryfallCard;
}

function makeIntent(overrides: Partial<SearchIntent> = {}): SearchIntent {
  return {
    colors: null,
    types: [],
    cmc: null,
    power: null,
    toughness: null,
    tags: [],
    oraclePatterns: [],
    ...overrides,
  } as unknown as SearchIntent;
}

describe('detectMethod', () => {
  it('identifies an activation tax', () => {
    const card = makeCard({
      oracle_text: 'Activated abilities of artifacts your opponents control cost {2} more to activate.',
    });
    expect(detectMethod(card)).toBe('activation_tax');
  });

  it('identifies a static lock', () => {
    expect(detectMethod(makeCard({ oracle_text: "Players can't search libraries." }))).toBe(
      'static_lock',
    );
  });

  it('identifies mass removal ahead of spot removal', () => {
    const card = makeCard({ oracle_text: 'Destroy all artifacts. Destroy target creature.' });
    expect(detectMethod(card)).toBe('mass_removal');
  });

  it('returns null for vanilla cards', () => {
    expect(detectMethod(makeCard({ oracle_text: '' }))).toBeNull();
  });
});

describe('detectRole', () => {
  it('detects the dominant role from oracle text', () => {
    expect(detectRole(makeCard({ oracle_text: 'Destroy target creature.' }))).toBe('removal');
  });

  it('returns null when nothing matches', () => {
    expect(detectRole(makeCard({ oracle_text: 'Flying.' }))).toBeNull();
  });
});

describe('deriveConcept', () => {
  it('prefers function tags', () => {
    expect(deriveConcept(makeIntent({ tags: ['otag:treasure-hate'] }))).toBe('treasure hate');
  });

  it('falls back to oracle phrases, then types', () => {
    expect(deriveConcept(makeIntent({ oraclePatterns: ['o:"create a treasure"'] }))).toBe(
      'create a treasure',
    );
    expect(deriveConcept(makeIntent({ types: ['Artifact'] }))).toBe('artifact');
  });

  it('returns null without intent', () => {
    expect(deriveConcept(null)).toBeNull();
  });
});

describe('buildWhyItMatches', () => {
  it('returns null when there is no intent', () => {
    expect(buildWhyItMatches(makeCard({}), null)).toBeNull();
  });

  it('returns null when nothing verifiably matched', () => {
    const intent = makeIntent({ oraclePatterns: ['o:"draw a card"'] });
    expect(buildWhyItMatches(makeCard({ oracle_text: 'Flying.' }), intent)).toBeNull();
  });

  it('reports a direct match with role and method', () => {
    const card = makeCard({
      name: 'Tax Piece',
      type_line: 'Artifact',
      oracle_text: 'Activated abilities of artifacts your opponents control cost {2} more to activate.',
    });
    const report = buildWhyItMatches(
      card,
      makeIntent({ oraclePatterns: ['o:"cost {2} more to activate"'], types: ['Artifact'] }),
    );
    expect(report).not.toBeNull();
    expect(report!.directness).toBe('direct');
    expect(report!.method).toBe('activation_tax');
    expect(report!.summary).toBeTruthy();
    expect(report!.reasons.length).toBeGreaterThan(0);
  });

  it('marks structural-only matches as structural', () => {
    const report = buildWhyItMatches(
      makeCard({ oracle_text: 'Flying.', cmc: 1 }),
      makeIntent({ types: ['Creature'], cmc: { op: '<=', value: 2 } as never }),
    );
    expect(report).not.toBeNull();
    expect(report!.directness).toBe('structural');
  });
});

describe('intentFromScryfallQuery', () => {
  it('parses oracle phrases, tags, types and mana value', () => {
    const intent = intentFromScryfallQuery(
      'otag:artifact-removal t:instant o:"destroy target artifact" mv<=3',
    );
    expect(intent).not.toBeNull();
    expect(intent!.tags).toContain('otag:artifact-removal');
    expect(intent!.types).toContain('instant');
    expect(intent!.oraclePatterns).toContain('o:"destroy target artifact"');
  });

  it('returns null when the query carries no usable constraints', () => {
    expect(intentFromScryfallQuery('game:paper')).toBeNull();
    expect(intentFromScryfallQuery('')).toBeNull();
  });
});
