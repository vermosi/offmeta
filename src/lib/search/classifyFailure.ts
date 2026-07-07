/**
 * Classify a zero-result search query into a failure reason bucket so we can
 * see which failure classes dominate (misspellings vs. wrapper phrases vs.
 * missing concepts) and measure how many the fuzzy resolver rescues.
 *
 * Buckets:
 * - `misspelling`      — bare card-name-shaped input (fuzzy resolver's target)
 * - `wrapper_phrase`   — "cards like X", "X alternatives", "what card is like X"
 * - `missing_concept`  — descriptive text using search vocabulary we don't cover
 * - `too_short`        — < 3 chars, nothing to translate
 * - `unknown`          — didn't fit any bucket
 */

import { extractCardNameCandidate, isLikelyCardName } from './fallback';

export type FailureReason =
  | 'misspelling'
  | 'wrapper_phrase'
  | 'missing_concept'
  | 'too_short'
  | 'unknown';

const WRAPPER_PATTERNS: RegExp[] = [
  /\b(?:cards?|which|what(?:'?s|\s+is)?)\s+(?:that\s+(?:is|are|works?|plays?)\s+)?(?:like|similar\s+to)\b/i,
  /\b(?:alternatives?|replacements?)\s+(?:to|for)\b/i,
  /\b(?:but\s+(?:cheaper|budget|better))$/i,
  /\b(?:alternatives?|replacements?)$/i,
];

const CONCEPT_KEYWORDS =
  /\b(with|that|under|below|above|less|more|cheap|budget|from|legal|commander|deck|spells?|cards?|creatures?|artifacts?|enchantments?|lands?|instants?|sorcery|sorceries|produce|generate|create|make|draw|search|find|tap|payoffs?|synerg(?:y|ies)|mana|rocks?|wipes?|board|ramp|removal|counter|mill|blink|token|sacrifice|reanimat|lifegain|tutor)\b/i;

export function classifyFailureReason(query: string): FailureReason {
  const trimmed = query.trim();
  if (trimmed.length < 3) return 'too_short';

  // Wrapper phrases first — they take priority even if the inner name is
  // also a misspelling, because the wrapper is the fixable surface.
  if (WRAPPER_PATTERNS.some((re) => re.test(trimmed))) {
    return 'wrapper_phrase';
  }

  // Bare card-name-shaped input → likely misspelling
  if (isLikelyCardName(trimmed)) return 'misspelling';

  // If the extractor finds a name candidate (short non-keyword phrase),
  // it's still fuzzy-recoverable.
  if (extractCardNameCandidate(trimmed)) return 'misspelling';

  // Uses search vocabulary → we tried to translate but failed
  if (CONCEPT_KEYWORDS.test(trimmed)) return 'missing_concept';

  return 'unknown';
}
