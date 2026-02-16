/**
 * Hook for accessing translations.
 * Separated from I18nProvider to satisfy react-refresh (components-only exports).
 */

import { useContext, useMemo } from 'react';
import { I18nContext } from './context';
import en from './en.json';

/**
 * Returns a `t(key)` function that resolves translation strings,
 * plus `locale` and `setLocale` for switching languages.
 */
export function useTranslation() {
  const { dictionary, locale, setLocale } = useContext(I18nContext);

  const t = useMemo(() => {
    return (key: string, fallback?: string): string =>
      dictionary[key] ?? (en as Record<string, string>)[key] ?? fallback ?? key;
  }, [dictionary]);

  return { t, locale, setLocale };
}
