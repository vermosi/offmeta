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

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

function scheduleIdle(cb: () => void): () => void {
  const w = window as IdleWindow;
  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(cb, { timeout: 2000 });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(cb, 0);
  return () => window.clearTimeout(id);
}

interface I18nProviderProps {
  children: ReactNode;
}

/**
 * Wrap your app with `<I18nProvider>` to enable locale switching.
 *
 * Boot path is fully non-blocking for first paint:
 *  - Initial render starts with `locale='en'` and an empty dictionary, so
 *    consumers immediately see their inline English `fallback` strings.
 *  - localStorage read, browser-locale detection, AND the dictionary
 *    `import()` are all deferred to `requestIdleCallback` after the first
 *    commit, so they never run during render or as a layout-adjacent effect.
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>('en');
  const [, force] = useState(0);

  const dictionary = loadedDictionaries[locale] ?? EMPTY_DICT;

  // Resolve the user's preferred locale only after first paint.
  useEffect(() => {
    let cancelled = false;
    const cancel = scheduleIdle(() => {
      if (cancelled) return;
      let resolved: SupportedLocale = 'en';
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && stored in LOCALE_LOADERS) {
          resolved = stored as SupportedLocale;
        } else {
          resolved = detectBrowserLocale() ?? 'en';
          try {
            localStorage.setItem(STORAGE_KEY, resolved);
          } catch {
            /* storage unavailable */
          }
        }
      } catch {
        /* storage unavailable */
      }
      if (!cancelled && resolved !== 'en') setLocaleState(resolved);
      // Even when staying on `en`, kick off the dictionary load.
      if (!cancelled) loadDictionary(resolved);
    });
    return () => {
      cancelled = true;
      cancel();
    };
  }, []);

  // Re-load dictionary whenever the user explicitly switches locales.
  useEffect(() => {
    if (loadedDictionaries[locale]) return;
    const cancel = scheduleIdle(() => loadDictionary(locale));
    return cancel;
  }, [locale]);

  function loadDictionary(target: SupportedLocale) {
    if (loadedDictionaries[target]) return;
    const loader = LOCALE_LOADERS[target] ?? LOCALE_LOADERS.en;
    loader()
      .then((mod) => {
        loadedDictionaries[target] = mod.default;
        force((n) => n + 1);
      })
      .catch(() => {
        loadedDictionaries[target] = {};
        force((n) => n + 1);
      });
  }

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
