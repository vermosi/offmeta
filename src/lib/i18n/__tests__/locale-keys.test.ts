import { describe, it, expect } from 'vitest';
import en from '@/lib/i18n/en.json';
import es from '@/lib/i18n/es.json';
import fr from '@/lib/i18n/fr.json';
import de from '@/lib/i18n/de.json';
import itLocale from '@/lib/i18n/it.json';
import pt from '@/lib/i18n/pt.json';
import ja from '@/lib/i18n/ja.json';
import ko from '@/lib/i18n/ko.json';
import ru from '@/lib/i18n/ru.json';
import zhs from '@/lib/i18n/zhs.json';
import zht from '@/lib/i18n/zht.json';

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
