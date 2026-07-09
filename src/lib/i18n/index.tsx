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
import enDictionary from './en.json';

// Re-export for unit tests
// eslint-disable-next-line react-refresh/only-export-components
export { detectBrowserLocale } from './detect-locale';

type TranslationDictionary = Record<string, string>;

/**
 * Lazy loaders for all locales — English included so it doesn't bloat the
 * homepage entry bundle. Each returns a dynamic import that Vite code-splits.
 */
const LOCALE_LOADERS: Record<
  string,
  () => Promise<{ default: TranslationDictionary }>
> = {
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

/** Cache loaded dictionaries so we only fetch each once. English ships in the entry. */
const loadedDictionaries: Record<string, TranslationDictionary> = {
  en: enDictionary as TranslationDictionary,
};
const EMPTY_DICT: TranslationDictionary = {};

const STORAGE_KEY = 'offmeta-locale';
const IS_TEST_MODE = import.meta.env.MODE === 'test';

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

function resolveInitialLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in LOCALE_LOADERS) {
      return stored as SupportedLocale;
    }
    const detected = detectBrowserLocale() ?? 'en';
    localStorage.setItem(STORAGE_KEY, detected);
    return detected;
  } catch {
    return 'en';
  }
}

interface I18nProviderProps {
  children: ReactNode;
}

/**
 * Wrap your app with `<I18nProvider>` to enable locale switching.
 *
 * Boot path keeps dictionary loading non-blocking for first paint:
 *  - Initial render resolves only the preferred locale from localStorage or
 *    browser settings so consumers see the correct locale immediately.
 *  - Dictionary `import()` calls remain deferred to `requestIdleCallback` after
 *    the first commit; components should pass inline English fallbacks to `t()`.
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] =
    useState<SupportedLocale>(resolveInitialLocale);
  const [, force] = useState(0);

  const dictionary = loadedDictionaries[locale] ?? EMPTY_DICT;

  const loadDictionary = useCallback((target: SupportedLocale) => {
    if (loadedDictionaries[target]) return;
    const loader = LOCALE_LOADERS[target] ?? LOCALE_LOADERS.en;
    loader()
      .then((mod) => {
        loadedDictionaries[target] = mod.default;
        // Only re-render if the freshly loaded dictionary will actually
        // change visible text. Every `t(key, fallback)` call already returns
        // the inline English fallback, so loading the English dictionary
        // doesn't change a single string — skip the re-render to avoid
        // flushing every i18n consumer (Index, Header, etc.) for nothing.
        if (target !== 'en') force((n) => n + 1);
      })
      .catch(() => {
        loadedDictionaries[target] = {};
        // Same reasoning: an empty dict falls back to English, no re-render needed.
      });
  }, []);

  // Resolve the user's preferred locale only after first paint.
  useEffect(() => {
    if (IS_TEST_MODE) return undefined;

    let cancelled = false;
    const cancel = scheduleIdle(() => {
      if (cancelled) return;
      if (locale !== 'en') {
        loadDictionary(locale);
      }
    });
    return () => {
      cancelled = true;
      cancel();
    };
  }, [loadDictionary, locale]);

  // Re-load dictionary whenever the user explicitly switches locales.
  useEffect(() => {
    if (IS_TEST_MODE) return undefined;
    if (loadedDictionaries[locale]) return;
    const cancel = scheduleIdle(() => loadDictionary(locale));
    return cancel;
  }, [locale, loadDictionary]);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      dictionary,
      locale,
      setLocale,
    }),
    [dictionary, locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
