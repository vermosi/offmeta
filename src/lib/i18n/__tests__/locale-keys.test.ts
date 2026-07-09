import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

function loadLocale(locale: string) {
  const filePath = resolve(process.cwd(), 'src/lib/i18n', `${locale}.json`);
  return JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, string>;
}

const en = loadLocale('en');
const es = loadLocale('es');
const fr = loadLocale('fr');
const de = loadLocale('de');
const itLocale = loadLocale('it');
const pt = loadLocale('pt');
const ja = loadLocale('ja');
const ko = loadLocale('ko');
const ru = loadLocale('ru');
const zhs = loadLocale('zhs');
const zht = loadLocale('zht');

const locales: Record<string, Record<string, string>> = {
  es,
  fr,
  de,
  it: itLocale,
  pt,
  ja,
  ko,
  ru,
  zhs,
  zht,
};

describe('locale dictionaries', () => {
  it('contain all english keys', () => {
    const enKeys = Object.keys(en);

    for (const [locale, dict] of Object.entries(locales)) {
      const missing = enKeys.filter((key) => !(key in dict));
      expect(
        missing,
        `${locale} is missing keys: ${missing.join(', ')}`,
      ).toEqual([]);
    }
  });
});
