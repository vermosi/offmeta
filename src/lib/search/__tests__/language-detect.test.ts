import { describe, expect, it } from 'vitest';

import { detectNonEnglishQuery } from '../../../../supabase/functions/_shared/languageDetect';

describe('detectNonEnglishQuery', () => {
  it('flags plain-ASCII Spanish queries', () => {
    const result = detectNonEnglishQuery('las mejores cartas para sephiroth');
    expect(result.isNonEnglish).toBe(true);
    expect(result.language).toBe('es');
  });

  it('flags accent-free Portuguese, French, German and Italian queries', () => {
    expect(detectNonEnglishQuery('melhores cartas para atraxa').isNonEnglish).toBe(true);
    expect(detectNonEnglishQuery('meilleures cartes pour atraxa').isNonEnglish).toBe(true);
    expect(detectNonEnglishQuery('beste karten fur atraxa').isNonEnglish).toBe(true);
    expect(detectNonEnglishQuery('migliori carte per atraxa').isNonEnglish).toBe(true);
  });

  it('leaves English queries alone', () => {
    expect(detectNonEnglishQuery('best cards for sephiroth').isNonEnglish).toBe(false);
    expect(detectNonEnglishQuery('cheap red treasure cards').isNonEnglish).toBe(false);
    expect(detectNonEnglishQuery('commander legal tutors under $10').isNonEnglish).toBe(false);
    expect(detectNonEnglishQuery('cards like rhystic study').isNonEnglish).toBe(false);
  });

  it('does not flag single ambiguous tokens in card names', () => {
    expect(detectNonEnglishQuery('las vegas').isNonEnglish).toBe(false);
    expect(detectNonEnglishQuery('per bast').isNonEnglish).toBe(false);
  });
});
