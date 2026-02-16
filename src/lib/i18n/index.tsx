/**
 * Lightweight i18n infrastructure.
 * Provides a `useTranslation` hook backed by a JSON dictionary.
 * Supports locale switching via I18nProvider context.
 */

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import en from './en.json';
import es from './es.json';

type TranslationDictionary = Record<string, string>;

export type SupportedLocale = 'en' | 'es';

export const SUPPORTED_LOCALES: { code: SupportedLocale; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

const DICTIONARIES: Record<string, TranslationDictionary> = { en, es };

/** Map app locales to Scryfall language codes. */
export const LOCALE_TO_SCRYFALL_LANG: Record<SupportedLocale, string> = {
  en: 'en',
  es: 'es',
};

const STORAGE_KEY = 'offmeta-locale';

function getInitialLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in DICTIONARIES) return stored as SupportedLocale;
  } catch {
    // SSR or storage unavailable
  }
  return 'en';
}

interface I18nContextValue {
  dictionary: TranslationDictionary;
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
}

const I18nContext = createContext<I18nContextValue>({
  dictionary: en,
  locale: 'en',
  setLocale: () => {},
});

interface I18nProviderProps {
  children: ReactNode;
}

/**
 * Wrap your app with `<I18nProvider>` to enable locale switching.
 * Persists selection to localStorage.
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(getInitialLocale);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      dictionary: DICTIONARIES[locale] ?? en,
      locale,
      setLocale,
    }),
    [locale, setLocale],
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

/**
 * Returns a `t(key)` function that resolves translation strings,
 * plus `locale` and `setLocale` for switching languages.
 */
export function useTranslation() {
  const { dictionary, locale, setLocale } = useContext(I18nContext);

  const t = useMemo(() => {
    return (key: string, fallback?: string): string =>
      dictionary[key] ?? fallback ?? key;
  }, [dictionary]);

  return { t, locale, setLocale };
}
