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
  // Leading "cards like X" / "cards similar to X" / "cards that are like X"
  /^cards?\s+(?:that\s+(?:is|are|works?|plays?)\s+)?(?:like|similar\s+to)\b/i,
  // Leading "what/which (card) (is) like|similar to X"
  /^(?:what(?:'?s|\s+is)?|which)\b.*\b(?:like|similar\s+to)\b/i,
  // "is there a card like|similar to X"
  /^(?:is\s+there\s+)?a\s+cards?\s+(?:that\s+(?:is|works?|plays?)\s+)?(?:like|similar\s+to)\b/i,
  // Leading "similar (cards) to X"
  /^similar\s+(?:cards?\s+)?to\b/i,
  // "alternatives|replacements to|for X"
  /\b(?:alternatives?|replacements?)\s+(?:to|for)\b/i,
  // Trailing "X but cheaper|budget|better"
  /\bbut\s+(?:cheaper|budget|better)$/i,
  // Trailing "X alternatives|replacements"
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
