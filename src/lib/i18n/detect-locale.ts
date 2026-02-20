/**
 * Browser locale auto-detection logic.
 * Kept in a dedicated file so index.tsx can export only the I18nProvider
 * component — a requirement for Vite Fast Refresh.
 */

import type { SupportedLocale } from './constants';

const SUPPORTED = new Set(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'ru', 'zhs', 'zht']);

/**
 * Maps a BCP-47 browser language tag (e.g. "fr-FR", "zh-Hans-CN") to the
 * closest supported app locale, or returns null if no match.
 */
export function detectBrowserLocale(): SupportedLocale | null {
  try {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const lang of langs) {
      const lower = lang.toLowerCase();
      // Chinese variants first (more specific)
      if (lower.startsWith('zh-hant') || lower === 'zh-tw' || lower === 'zh-hk' || lower === 'zh-mo') return 'zht';
      if (lower.startsWith('zh-hans') || lower === 'zh-cn' || lower === 'zh-sg' || lower === 'zh') return 'zhs';
      // Simple prefix match for the rest
      const prefix = lower.split('-')[0];
      if (SUPPORTED.has(prefix)) return prefix as SupportedLocale;
    }
  } catch {
    // navigator not available (SSR / privacy mode)
  }
  return null;
}
