import { describe, it, expect, beforeAll, vi } from 'vitest';

// The edge module graph touches Deno.env at import time.
vi.stubGlobal('Deno', {
  env: { get: (key: string) => `test-${key}` },
});

let wrapBareWords: (segment: string) => string;
let normalizeQuery: (query: string) => string;
let buildDeterministicIntent: (query: string) => { deterministicQuery: string };

beforeAll(async () => {
  ({ wrapBareWords } = await import(
    '../../../../supabase/functions/semantic-search/fallback.ts'
  ));
  ({ normalizeQuery } = await import(
    '../../../../supabase/functions/semantic-search/deterministic/normalize.ts'
  ));
  ({ buildDeterministicIntent } = await import(
    '../../../../supabase/functions/semantic-search/deterministic/index.ts'
  ));
});

describe('low-confidence query remediation', () => {
  it('drops prose noise that produced dead oracle terms', () => {
    for (const noise of ['affect', 'deck', 'similar', 'archetype', 'mechanics', 'own']) {
      expect(wrapBareWords(noise)).toBe('');
    }
  });

  it('drops non-English filler instead of searching English oracle text', () => {
    expect(wrapBareWords('las mejores cartas')).toBe('');
    expect(wrapBareWords('criaturas com efeito')).toBe('');
    expect(wrapBareWords('カード')).toBe('');
  });

  it('still promotes meaningful English words', () => {
    expect(wrapBareWords('trample')).toBe('o:"trample"');
  });

  it('repairs frequent misspellings', () => {
    expect(normalizeQuery('plainswalkers with removal')).toContain('planeswalker');
    expect(normalizeQuery('mono black splell')).toContain('spell');
    expect(normalizeQuery('artefact ramp')).toContain('artifact');
  });

  it('maps combat doubler phrasing to extra combat phases', () => {
    const { deterministicQuery } = buildDeterministicIntent('mardu combat phase doubler');
    expect(deterministicQuery).toContain('o:"additional combat phase"');
    expect(deterministicQuery).not.toContain('o:"doubler"');
  });

  it('maps finishers and game-enders to win conditions', () => {
    expect(buildDeterministicIntent('budget game-enders').deterministicQuery).toMatch(
      /otag:(win-condition|finisher)/,
    );
    expect(buildDeterministicIntent('finishers for rakdos').deterministicQuery).toMatch(
      /otag:(win-condition|finisher)/,
    );
  });
});
