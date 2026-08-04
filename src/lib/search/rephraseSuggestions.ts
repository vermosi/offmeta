/**
 * Rephrase suggestions for the terminal exact-name fallback.
 *
 * When every translation path fails, the pipeline degrades to an exact-name
 * search (`!"budget alternatives to rhystic study"`), which returns zero
 * results because the sentence is not a card name. This module detects that
 * terminal state and produces plain-English rephrasings the user can tap.
 *
 * @module lib/search/rephraseSuggestions
 */

/** Matches `!"..."` optionally followed by pipeline-appended filters. */
const EXACT_NAME_QUERY = /^!\s*"([^"]+)"\s*(?:game:paper)?\s*$/i;

/** Wrapper words stripped to recover the likely card name inside a sentence. */
const WRAPPER_PHRASES =
  /^(?:what(?:'s| is| are)?\s+)?(?:the\s+)?(?:best\s+)?(?:budget|cheap|cheaper|affordable|inexpensive|poor\s+man'?s)?\s*(?:alternatives?|replacements?|substitutes?|swaps?|options?|cards?)?\s*(?:to|for|like|similar\s+to)?\s+/i;

const TRAILING_WRAPPER =
  /\s+(?:but\s+cheaper|alternatives?|replacements?|substitutes?)\s*$/i;

const FORMAT_SUFFIX =
  /\s+\b(?:in|for)\s+(?:commander|edh|modern|legacy|pioneer|standard|pauper|vintage|brawl)\b.*$/i;

export interface RephraseSuggestion {
  /** Plain-English query to re-run. */
  query: string;
  /** Why we are suggesting it. */
  label: string;
}

/** True when the Scryfall query is the terminal exact-name fallback. */
export function isExactNameFallback(scryfallQuery: string | undefined): boolean {
  return !!scryfallQuery && EXACT_NAME_QUERY.test(scryfallQuery.trim());
}

/** Extracts the phrase the pipeline tried to match as an exact card name. */
export function getExactNamePhrase(
  scryfallQuery: string | undefined,
): string | null {
  const match = (scryfallQuery ?? '').trim().match(EXACT_NAME_QUERY);
  return match ? match[1].trim() : null;
}

/** Best-effort guess at the card the user actually meant. */
export function guessReferenceCard(phrase: string): string {
  return phrase
    .replace(FORMAT_SUFFIX, '')
    .replace(TRAILING_WRAPPER, '')
    .replace(WRAPPER_PHRASES, '')
    .replace(/^["']|["'?.!]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Builds rephrasings for a query that fell through to the exact-name fallback.
 * Returns an empty array when the query isn't in that terminal state.
 */
export function buildRephraseSuggestions(
  scryfallQuery: string | undefined,
  originalQuery?: string,
): RephraseSuggestion[] {
  const phrase = getExactNamePhrase(scryfallQuery);
  if (!phrase) return [];

  const source = (originalQuery ?? '').trim() || phrase;
  const card = guessReferenceCard(source);
  if (!card || card.length < 3) return [];

  const words = card.split(/\s+/).filter(Boolean);
  // A sentence-length remainder is a description, not a card name.
  if (words.length > 6) return [];

  const suggestions: RephraseSuggestion[] = [
    {
      query: `budget alternatives to ${card}`,
      label: 'Find cheaper cards that do the same thing',
    },
    {
      query: `cards like ${card}`,
      label: 'Find functionally similar cards',
    },
    {
      query: card,
      label: 'Search for the card by name only',
    },
  ];

  const seen = new Set<string>();
  return suggestions.filter((s) => {
    const key = s.query.toLowerCase();
    if (key === source.toLowerCase() || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
