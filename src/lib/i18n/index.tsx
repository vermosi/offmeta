/**
 * I18n provider component.
 * useTranslation is re-exported here for convenience.
 *
 * Locale dictionaries (including English) are lazy-loaded so the homepage
 * entry bundle does not ship a ~60KB JSON dictionary on first paint.
 * Components must always pass an inline English `fallback` to `t()` so the
 * UI renders correctly before the dictionary resolves.
 */

// eslint-disable-next-line react-refresh/only-export-components
export { useTranslation } from './useTranslation';

import {
  useMemo,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

import type { SupportedLocale } from './constants';
import { I18nContext, type I18nContextValue } from './context';
import { detectBrowserLocale } from './detect-locale';

// Re-export for unit tests
// eslint-disable-next-line react-refresh/only-export-components
export { detectBrowserLocale } from './detect-locale';

type TranslationDictionary = Record<string, string>;

/**
 * Lazy loaders for all locales — English included so it doesn't bloat the
 * homepage entry bundle. Each returns a dynamic import that Vite code-splits.
 */
const LOCALE_LOADERS: Record<string, () => Promise<{ default: TranslationDictionary }>> = {
  en: () => import('./en.json'),
  es: () => import('./es.json'),
  fr: () => import('./fr.json'),
  de: () => import('./de.json'),
  it: () => import('./it.json'),
  pt: () => import('./pt.json'),
  ja: () => import('./ja.json'),
  ko: () => import('./ko.json'),
  ru: () => import('./ru.json'),
  zhs: () => import('./zhs.json'),
  zht: () => import('./zht.json'),
};

/** Cache loaded dictionaries so we only fetch each once. */
const loadedDictionaries: Record<string, TranslationDictionary> = {};
const EMPTY_DICT: TranslationDictionary = {};

const STORAGE_KEY = 'offmeta-locale';

function getInitialLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in LOCALE_LOADERS) {
      return stored as SupportedLocale;
    }
  } catch {
    // SSR or storage unavailable
  }
  const detected = detectBrowserLocale();
  const locale = detected ?? 'en';
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // storage unavailable
  }
  return locale;
}

interface I18nProviderProps {
  children: ReactNode;
}

/**
 * Wrap your app with `<I18nProvider>` to enable locale switching.
 * Persists selection to localStorage.
 * All dictionaries (English included) are loaded on demand.
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(getInitialLocale);
  const [, force] = useState(0);

  const dictionary = loadedDictionaries[locale] ?? EMPTY_DICT;

  useEffect(() => {
    if (loadedDictionaries[locale]) return;
    const loader = LOCALE_LOADERS[locale] ?? LOCALE_LOADERS.en;
    let cancelled = false;
    loader()
      .then((mod) => {
        loadedDictionaries[locale] = mod.default;
        if (!cancelled) force((n) => n + 1);
      })
      .catch(() => {
        if (!cancelled) {
          loadedDictionaries[locale] = {};
          force((n) => n + 1);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

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
      dictionary,
      locale,
      setLocale,
    }),
    [dictionary, locale, setLocale],
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}
