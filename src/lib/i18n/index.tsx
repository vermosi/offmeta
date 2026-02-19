/**
 * I18n provider component.
 * useTranslation is re-exported here for convenience.
 */

// eslint-disable-next-line react-refresh/only-export-components
export { useTranslation } from './useTranslation';

import {
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import de from './de.json';
import it from './it.json';
import pt from './pt.json';
import ja from './ja.json';
import ko from './ko.json';
import ru from './ru.json';
import zhs from './zhs.json';
import zht from './zht.json';

import type { SupportedLocale } from './constants';
import { I18nContext, type I18nContextValue } from './context';

type TranslationDictionary = Record<string, string>;

const DICTIONARIES: Record<string, TranslationDictionary> = {
  en, es, fr, de, it, pt, ja, ko, ru, zhs, zht,
};

const STORAGE_KEY = 'offmeta-locale';

/**
 * Maps a BCP-47 browser language tag (e.g. "fr-FR", "zh-Hans-CN") to the
 * closest supported app locale, or returns null if no match.
 */
function detectBrowserLocale(): SupportedLocale | null {
  try {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const lang of langs) {
      const lower = lang.toLowerCase();
      // Chinese variants first (more specific)
      if (lower.startsWith('zh-hant') || lower === 'zh-tw' || lower === 'zh-hk' || lower === 'zh-mo') return 'zht';
      if (lower.startsWith('zh-hans') || lower === 'zh-cn' || lower === 'zh-sg' || lower === 'zh') return 'zhs';
      // Simple prefix match for the rest
      const prefix = lower.split('-')[0] as SupportedLocale;
      if (prefix in DICTIONARIES) return prefix;
    }
  } catch {
    // navigator not available (SSR / privacy mode)
  }
  return null;
}

function getInitialLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in DICTIONARIES) return stored as SupportedLocale;
  } catch {
    // SSR or storage unavailable
  }
  return detectBrowserLocale() ?? 'en';
}


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
