/**
 * Hook for accessing translations.
 * Separated from I18nProvider to satisfy react-refresh (components-only exports).
 *
 * NOTE: The English dictionary is intentionally NOT statically imported here.
 * It is lazy-loaded by `I18nProvider` so the homepage entry bundle does not
 * pay the ~60KB cost on first paint. Until the dictionary resolves, callers
 * fall back to the inline `fallback` argument (or the key itself).
 */

import { useContext, useMemo } from 'react';
import { I18nContext } from './context';

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
