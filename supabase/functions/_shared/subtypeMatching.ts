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
  // "heroes" singularizes to "heroe" under the naive rule, so also try the
  // "-es" plural form before giving up.
  const candidates = [lower, singularizeSubtype(lower)];
  if (/es$/i.test(lower) && lower.length > 3) candidates.push(lower.slice(0, -2));

  for (const candidate of candidates) {
    if (SUBTYPE_STOPWORDS.has(candidate)) return null;
  }
  for (const candidate of candidates) {
    if (SCRYFALL_SUBTYPE_SLUGS.has(candidate)) return candidate;
  }
  return null;
}

/** True when the word names a Scryfall subtype (tribe, land type, etc.). */
export function isSubtypeWord(word: string): boolean {
  return resolveSubtypeSlug(word) !== null;
}
