/**
 * Shared helpers for resolving natural-language words to Scryfall card
 * subtypes ("heroes" → `t:hero`).
 *
 * Lives here so every entry point — the deterministic parser, the slot
 * pipeline, and the art-tag matcher — agrees on which words are real tribes
 * and which are ordinary English that only looks like a tribe.
 */
import { SCRYFALL_SUBTYPE_SLUGS } from './subtype-vocabulary.ts';

/**
 * Words that look like subtypes but are far more often used as plain English
 * or as MTG mechanics vocabulary. Resolving these to `t:` hijacks the query.
 */
export const SUBTYPE_STOPWORDS = new Set([
  'ally',
  'assembly',
  'construct',
  'guest',
  'mount',
  'noble',
  'nomad',
  'processor',
  'scout',
  'servo',
  'shaman',
  'spawn',
  'sponge',
  'time',
  'townsfolk',
  'unicorn',
  'volver',
  'wall',
  'ward',
  'worker',
]);

/** Naive English singularization limited to subtype-shaped nouns. */
export function singularizeSubtype(word: string): string {
  if (/ves$/i.test(word)) return word.replace(/ves$/i, 'f');
  if (/ies$/i.test(word)) return word.replace(/ies$/i, 'y');
  if (/(ch|sh|ss|x|z)es$/i.test(word)) return word.replace(/es$/i, '');
  if (/s$/i.test(word) && !/ss$/i.test(word)) return word.replace(/s$/i, '');
  return word;
}

/**
 * Returns the canonical subtype slug for a word, or null when the word is not
 * a subtype (or is a stopword that should keep its plain-English reading).
 */
export function resolveSubtypeSlug(word: string): string | null {
  const lower = word.toLowerCase();
  if (SUBTYPE_STOPWORDS.has(lower)) return null;
  const singular = singularizeSubtype(lower);
  if (SUBTYPE_STOPWORDS.has(singular)) return null;
  if (SCRYFALL_SUBTYPE_SLUGS.has(lower)) return lower;
  if (SCRYFALL_SUBTYPE_SLUGS.has(singular)) return singular;
  return null;
}

/** True when the word names a Scryfall subtype (tribe, land type, etc.). */
export function isSubtypeWord(word: string): boolean {
  return resolveSubtypeSlug(word) !== null;
}
