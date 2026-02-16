/**
 * Helpers for displaying Scryfall card data in the user's locale.
 * Falls back to English fields when localized data is unavailable.
 * @module lib/scryfall/localized
 */

import type { ScryfallCard } from '@/types/card';

/** Get the localized card name, falling back to English. */
export function getLocalizedName(card: ScryfallCard, locale: string): string {
  if (locale !== 'en' && card.printed_name) return card.printed_name;
  return card.name;
}

/** Get the localized type line, falling back to English. */
export function getLocalizedTypeLine(card: ScryfallCard, locale: string): string {
  if (locale !== 'en' && card.printed_type_line) return card.printed_type_line;
  return card.type_line;
}

/** Get the localized oracle text, falling back to English. */
export function getLocalizedOracleText(card: ScryfallCard, locale: string): string | undefined {
  if (locale !== 'en' && card.printed_text) return card.printed_text;
  return card.oracle_text;
}
