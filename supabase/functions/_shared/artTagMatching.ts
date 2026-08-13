/**
 * Resolves natural-language artwork references ("shirtless cards",
 * "cards with a shirtless person in the art") into Scryfall `atag:` queries.
 *
 * Scryfall indexes ~12.8k art tags, but nothing in the deterministic pipeline
 * knew about them unless the phrase matched a hardcoded "X in the art" pattern.
 * A query like "shirtless cards" fell through to the AI, which produced
 * `o:"shirtless"` and zero results. Matching here is deterministic and driven
 * entirely by the generated vocabulary, so the same input always yields the
 * same query.
 */
import { SCRYFALL_ART_TAG_SET } from './art-tag-vocabulary.ts';

/** Words that carry no meaning when someone describes card artwork. */
const FILLER_WORDS = new Set([
  'a',
  'all',
  'an',
  'and',
  'any',
  'art',
  'artwork',
  'card',
  'cards',
  'depicting',
  'featuring',
  'find',
  'has',
  'have',
  'illustration',
  'illustrations',
  'in',
  'magic',
  'me',
  'mtg',
  'of',
  'on',
  'picture',
  'pictures',
  'ショー',
  'show',
  'showing',
  'some',
  'that',
  'the',
  'their',
  'them',
  'they',
  'which',
  'with',
]);

/**
 * Art tags that would hijack a much more common functional/type reading.
 * "dragon" must stay `t:dragon`, not `atag:dragon`.
 */
const RESERVED_TERMS = new Set([
  'angel',
  'artifact',
  'beast',
  'bird',
  'cat',
  'demon',
  'dog',
  'dragon',
  'elf',
  'goblin',
  'human',
  'knight',
  'land',
  'mountain',
  'plains',
  'sacrifice',
  'snake',
  'soldier',
  'spider',
  'swamp',
  'token',
  'treasure',
  'vampire',
  'wizard',
  'wolf',
  'zombie',
]);

export interface ArtTagMatch {
  tag: string;
  query: string;
}

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strips filler words and returns the meaningful tokens of a query. */
function contentTokens(query: string): string[] {
  return normalize(query)
    .split(' ')
    .filter((token) => token.length > 0 && !FILLER_WORDS.has(token));
}

function lookupTag(tokens: string[]): string | null {
  if (tokens.length === 0 || tokens.length > 4) return null;
  const joined = tokens.join('-');
  if (RESERVED_TERMS.has(joined)) return null;
  if (SCRYFALL_ART_TAG_SET.has(joined)) return joined;

  // "shirtless people" → try the singular form of the trailing word.
  const last = tokens[tokens.length - 1];
  if (last.length > 3 && last.endsWith('s')) {
    const singular = [...tokens.slice(0, -1), last.replace(/s$/, '')].join('-');
    if (!RESERVED_TERMS.has(singular) && SCRYFALL_ART_TAG_SET.has(singular)) {
      return singular;
    }
  }
  return null;
}

/**
 * Returns an `atag:` query when the whole query (minus filler) names a known
 * Scryfall art tag. Returns null for anything else so normal parsing wins.
 */
export function matchArtTagQuery(query: string): ArtTagMatch | null {
  if (!query || query.trim().length < 3) return null;

  const explicitArt = /\b(art|artwork|illustration|picture)\b/i.test(query);
  const tokens = contentTokens(query);
  const tag = lookupTag(tokens);
  if (!tag) return null;

  // Single-word art tags without an explicit "art" mention are only safe when
  // the term is unmistakably artwork vocabulary (not a type/mechanic word).
  if (!explicitArt && tokens.length === 1 && tokens[0].length < 5) return null;

  return { tag, query: `atag:${tag}` };
}

/** True when the query resolves to an art tag. */
export function isLikelyArtTagQuery(query: string): boolean {
  return matchArtTagQuery(query) !== null;
}
