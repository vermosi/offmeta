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

/**
 * Case-folds, strips diacritics, and collapses every separator (spaces,
 * underscores, hyphens, punctuation) so "Shirtless_Cards", "shirtless-cards"
 * and "  SHIRTLESS  cards " all reduce to the same token stream.
 */
function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strips filler words and returns the meaningful tokens of a query. */
function contentTokens(query: string): string[] {
  return normalize(query)
    .split(' ')
    .filter((token) => token.length > 0 && !FILLER_WORDS.has(token));
}

/**
 * Returns the singular/plural spelling variants of a single token, most
 * specific first. Handles the regular English forms present in the Scryfall
 * art-tag vocabulary (people/person is covered by the filler/vocabulary sets).
 */
function tokenVariants(token: string): string[] {
  const variants = [token];
  const add = (value: string) => {
    if (value.length > 1 && !variants.includes(value)) variants.push(value);
  };

  if (token.endsWith('ies') && token.length > 4) add(`${token.slice(0, -3)}y`);
  if (token.endsWith('ses') || token.endsWith('xes') || token.endsWith('zes')) {
    add(token.slice(0, -2));
  }
  if (token.endsWith('ches') || token.endsWith('shes')) add(token.slice(0, -2));
  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) {
    add(token.slice(0, -1));
  }
  // Singular input, plural tag ("shirtless person" style vocabulary entries).
  if (!token.endsWith('s')) {
    add(`${token}s`);
    if (token.endsWith('y') && token.length > 2) add(`${token.slice(0, -1)}ies`);
  }
  return variants;
}

/** Cartesian product of per-token variants, capped to keep lookups cheap. */
function candidateTags(tokens: string[]): string[] {
  let combos: string[][] = [[]];
  for (const token of tokens) {
    const next: string[][] = [];
    for (const combo of combos) {
      for (const variant of tokenVariants(token)) {
        next.push([...combo, variant]);
      }
    }
    combos = next.slice(0, 32);
  }
  return combos.map((combo) => combo.join('-'));
}

function lookupTag(tokens: string[]): string | null {
  if (tokens.length === 0 || tokens.length > 4) return null;

  for (const candidate of candidateTags(tokens)) {
    if (RESERVED_TERMS.has(candidate)) return null;
    if (SCRYFALL_ART_TAG_SET.has(candidate)) return candidate;
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

  // Any reserved type/mechanic word anywhere in the query ("red dragon",
  // "wolf pack") means the functional reading wins unless the user explicitly
  // asked about artwork.
  if (
    !explicitArt &&
    tokens.some((token) =>
      tokenVariants(token).some((variant) => RESERVED_TERMS.has(variant)),
    )
  ) {
    return null;
  }

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
