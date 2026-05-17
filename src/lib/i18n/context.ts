/**
 * Shared i18n context definition.
 * Extracted so both I18nProvider and useTranslation can reference it
 * without circular imports.
 *
 * NOTE: en.json is intentionally NOT imported here. The provider lazy-loads
 * the active locale (English included) so the homepage entry bundle does
 * not ship the ~60KB dictionary on first paint.
 */

import { createContext } from 'react';
import type { SupportedLocale } from './constants';

type TranslationDictionary = Record<string, string>;

export interface I18nContextValue {
  dictionary: TranslationDictionary;
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
}

export const I18nContext = createContext<I18nContextValue>({
  dictionary: {},
  locale: 'en',
  setLocale: () => {},
});
