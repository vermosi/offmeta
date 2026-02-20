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
import { detectBrowserLocale } from './detect-locale';
import { logger } from '@/lib/core/logger';

// Re-export for unit tests
// eslint-disable-next-line react-refresh/only-export-components
export { detectBrowserLocale } from './detect-locale';

type TranslationDictionary = Record<string, string>;

const DICTIONARIES: Record<string, TranslationDictionary> = {
  en, es, fr, de, it, pt, ja, ko, ru, zhs, zht,
};

const STORAGE_KEY = 'offmeta-locale';

function getInitialLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in DICTIONARIES) {
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
  // Persist so detection only runs once — subsequent loads restore from storage.
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
