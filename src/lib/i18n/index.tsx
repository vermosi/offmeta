/**
 * Lightweight i18n infrastructure.
 * Provides a `useTranslation` hook backed by a JSON dictionary.
 * Supports future multi-language expansion via I18nProvider context.
 */

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import en from './en.json';

type TranslationDictionary = Record<string, string>;

const I18nContext = createContext<TranslationDictionary>(en);

interface I18nProviderProps {
  locale?: string;
  children: ReactNode;
}

// Map of locale → dictionary.  Only English for now.
const DICTIONARIES: Record<string, TranslationDictionary> = {
  en,
};

/**
 * Wrap your app with `<I18nProvider>` to set the active locale.
 * Defaults to English.
 */
export function I18nProvider({ locale = 'en', children }: I18nProviderProps) {
  const dictionary = useMemo(
    () => DICTIONARIES[locale] ?? en,
    [locale],
  );

  return (
    <I18nContext.Provider value={dictionary}>{children}</I18nContext.Provider>
  );
}

/**
 * Returns a `t(key)` function that resolves translation strings.
 * Falls back to the key itself if no translation is found.
 *
 * Usage:
 * ```tsx
 * const { t } = useTranslation();
 * <span>{t('hero.title')}</span>
 * ```
 */
export function useTranslation() {
  const dictionary = useContext(I18nContext);

  const t = useMemo(() => {
    return (key: string, fallback?: string): string =>
      dictionary[key] ?? fallback ?? key;
  }, [dictionary]);

  return { t };
}
