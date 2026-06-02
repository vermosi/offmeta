/**
 * Hook for accessing translations.
 * Separated from I18nProvider to satisfy react-refresh (components-only exports).
 *
 * Resolution order for `t(key, fallback)`:
 *   1. Active locale dictionary (from I18nProvider context)
 *   2. Inline English `fallback` argument (if provided)
 *   3. Static English dictionary (`en.json`) — ensures real copy renders
 *      even when a component is mounted outside the provider (e.g. unit tests)
 *      or before a non-English dictionary finishes lazy-loading.
 *   4. The key itself (last-resort, prevents undefined output)
 */

import { useContext, useMemo } from 'react';
import { I18nContext } from './context';
import enDictionary from './en.json';

const EN_DICT = enDictionary as Record<string, string>;

/**
 * Returns a `t(key)` function that resolves translation strings,
 * plus `locale` and `setLocale` for switching languages.
 */
export function useTranslation() {
  const { dictionary, locale, setLocale } = useContext(I18nContext);

  const t = useMemo(() => {
    return (key: string, fallback?: string): string =>
      dictionary[key] ?? fallback ?? EN_DICT[key] ?? key;
  }, [dictionary]);

  return { t, locale, setLocale };
}
