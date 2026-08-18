import { describe, expect, it } from 'vitest';

import {
  detectNonEnglishQuery,
  hasNonLatinScript,
} from '../../../../supabase/functions/_shared/languageDetect';
import { SUPPORTED_LOCALES } from '@/lib/i18n/constants';

/**
 * Every locale OffMeta ships must route a realistic search into the
 * pre-translation path, either via function-word signals (Latin scripts) or
 * via script detection (ja / ko / ru / zhs / zht).
 */
const LOCALE_QUERIES: Record<string, string> = {
  en: 'best cards for sephiroth',
  es: 'las mejores cartas para sephiroth',
  fr: 'meilleures cartes pour atraxa',
  de: 'beste karten fur atraxa',
  it: 'migliori carte per atraxa',
  pt: 'melhores cartas para atraxa',
  ja: 'アトラクサ におすすめ の カード',
  ko: '아트락사 에 좋은 카드',
  ru: 'лучшие карты для атраксы',
  zhs: '适合阿崔亚萨的最佳卡牌',
  zht: '適合阿崔亞薩的最佳卡牌',
};

/** A query is translated when either signal fires. */
function looksNonEnglish(query: string): boolean {
  return hasNonLatinScript(query) || detectNonEnglishQuery(query).isNonEnglish;
}

describe('language coverage across supported locales', () => {
  it('has a test query for every supported locale', () => {
    for (const { code } of SUPPORTED_LOCALES) {
      expect(LOCALE_QUERIES[code], `missing query for ${code}`).toBeTruthy();
    }
  });

  it.each(
    SUPPORTED_LOCALES.filter((l) => l.code !== 'en').map((l) => [l.code]),
  )('flags %s queries as non-English', (code) => {
    expect(looksNonEnglish(LOCALE_QUERIES[code])).toBe(true);
  });

  it('does not flag the English query', () => {
    expect(looksNonEnglish(LOCALE_QUERIES.en)).toBe(false);
  });
});

describe('hasNonLatinScript', () => {
  it('detects Japanese, Korean, Russian and Chinese characters', () => {
    expect(hasNonLatinScript('カード')).toBe(true);
    expect(hasNonLatinScript('카드')).toBe(true);
    expect(hasNonLatinScript('карты')).toBe(true);
    expect(hasNonLatinScript('卡牌')).toBe(true);
    expect(hasNonLatinScript('繁體')).toBe(true);
  });

  it('ignores Latin text including accents', () => {
    expect(hasNonLatinScript('cheap red treasure cards')).toBe(false);
    expect(hasNonLatinScript('cartes pas chères pour élesh')).toBe(false);
  });
});

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
    expect(detectNonEnglishQuery('mono black sacrifice outlets').isNonEnglish).toBe(false);
    expect(detectNonEnglishQuery('cheaper alternatives to rhystic study').isNonEnglish).toBe(false);
  });

  it('does not flag single ambiguous tokens in card names', () => {
    expect(detectNonEnglishQuery('las vegas').isNonEnglish).toBe(false);
    expect(detectNonEnglishQuery('per bast').isNonEnglish).toBe(false);
    expect(detectNonEnglishQuery('die young').isNonEnglish).toBe(false);
  });
});
