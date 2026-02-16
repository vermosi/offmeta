/**
 * Shared i18n context definition.
 * Extracted so both I18nProvider and useTranslation can reference it
 * without circular imports.
 */

import { createContext } from 'react';
import type { SupportedLocale } from './constants';
import en from './en.json';

type TranslationDictionary = Record<string, string>;

export interface I18nContextValue {
  dictionary: TranslationDictionary;
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
}

export const I18nContext = createContext<I18nContextValue>({
  dictionary: en,
  locale: 'en',
  setLocale: () => {},
});
