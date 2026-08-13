import { describe, it, expect, beforeAll, vi } from 'vitest';

// The edge module graph touches Deno.env at import time.
vi.stubGlobal('Deno', {
  env: { get: (key: string) => `test-${key}` },
});

let wrapBareWords: (segment: string) => string;

beforeAll(async () => {
  ({ wrapBareWords } = await import(
    '../../../../supabase/functions/semantic-search/fallback.ts'
  ));
});

describe('wrapBareWords', () => {
  it('promotes leftover words to oracle-text terms', () => {
    expect(wrapBareWords('shirtless')).toBe('o:"shirtless"');
  });

  it('drops filler words that would act as a name match', () => {
    expect(wrapBareWords('an art tag or otag for the card')).toBe('');
  });

  it('preserves existing Scryfall syntax untouched', () => {
    expect(wrapBareWords('c=r t:creature otag:removal')).toBe(
      'c=r t:creature otag:removal',
    );
  });

  it('keeps grouping and negation operators', () => {
    expect(wrapBareWords('(otag:draw or otag:ramp) -t:land')).toBe(
      '(otag:draw or otag:ramp) -t:land',
    );
  });

  it('caps the number of bare oracle terms', () => {
    const result = wrapBareWords('alpha beta gamma delta epsilon');
    expect(result.match(/o:"/g)).toHaveLength(3);
  });

  it('never emits raw prose', () => {
    const result = wrapBareWords(
      'art tag or otag richinfluential characters depicted on example',
    );
    expect(result).not.toMatch(/\b(?:characters|depicted|richinfluential)\b(?!")/);
    expect(result.split(' ').every((part) => part === '' || /[:=<>()"]/.test(part))).toBe(
      true,
    );
  });
});
