/**
 * Shared i18n constants extracted for Fast Refresh compatibility.
 * Components that need locale metadata import from here instead of index.tsx.
 * @module lib/i18n/constants
 */

export type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ja' | 'ko' | 'ru' | 'zhs' | 'zht';

export const SUPPORTED_LOCALES: { code: SupportedLocale; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'zhs', label: '简体中文', flag: '🇨🇳' },
  { code: 'zht', label: '繁體中文', flag: '🇹🇼' },
];

/** Map app locales to Scryfall language codes. */
export const LOCALE_TO_SCRYFALL_LANG: Record<SupportedLocale, string> = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  pt: 'pt',
  ja: 'ja',
  ko: 'ko',
  ru: 'ru',
  zhs: 'zhs',
  zht: 'zht',
};
