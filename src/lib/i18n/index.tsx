/**
 * I18n provider component.
 * useTranslation is re-exported here for convenience.
 *
 * Locale dictionaries are lazy-loaded (except English) to reduce
 * the main bundle size. Only the user's active locale is fetched.
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
import en from './en.json';

import type { SupportedLocale } from './constants';
import { I18nContext, type I18nContextValue } from './context';
import { detectBrowserLocale } from './detect-locale';
import { logger } from '@/lib/core/logger';

// Re-export for unit tests
// eslint-disable-next-line react-refresh/only-export-components
export { detectBrowserLocale } from './detect-locale';

type TranslationDictionary = Record<string, string>;

/**
 * Lazy loaders for non-English locales.
 * Each returns a dynamic import that Vite code-splits into its own chunk.
 */
const LOCALE_LOADERS: Record<string, () => Promise<{ default: TranslationDictionary }>> = {
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
const loadedDictionaries: Record<string, TranslationDictionary> = { en };

const STORAGE_KEY = 'offmeta-locale';

function getInitialLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (stored === 'en' || stored in LOCALE_LOADERS)) {
      logger.info(`[i18n] Restored locale from storage: ${stored}`);
      return stored as SupportedLocale;
    }
  } catch {
    // SSR or storage unavailable
  }
  const detected = detectBrowserLocale();
  const locale = detected ?? 'en';
  logger.info(
    `[i18n] navigator.languages=${JSON.stringify(navigator.languages ?? [navigator.language])} → detected=${detected ?? 'none'} → using=${locale}`,
  );
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
 * Non-English dictionaries are loaded on demand.
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(getInitialLocale);
  const [asyncDict, setAsyncDict] = useState<TranslationDictionary | null>(null);

  // Synchronously resolve the dictionary when it's already cached
  const syncDict = useMemo(() => loadedDictionaries[locale] ?? null, [locale]);

  // The active dictionary: prefer sync (cached), then async (loaded), then English fallback
  const dictionary = syncDict ?? asyncDict ?? en;

  // Only run the effect for async loading when no sync dictionary is available
  useEffect(() => {
    // If already cached synchronously, nothing to load
    if (loadedDictionaries[locale]) return;

    const loader = LOCALE_LOADERS[locale];
    if (!loader) {
      setAsyncDict(en);
      return;
    }

    let cancelled = false;
    setAsyncDict(null); // reset while loading
    loader()
      .then((mod) => {
        const dict = mod.default;
        loadedDictionaries[locale] = dict;
        if (!cancelled) setAsyncDict(dict);
      })
      .catch(() => {
        if (!cancelled) setAsyncDict(en);
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
