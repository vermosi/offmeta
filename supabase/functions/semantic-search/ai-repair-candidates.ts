/**
 * Deterministic repair candidates for AI translations that returned zero
 * results.
 *
 * Every zero-result search observed in production came from the AI path, and
 * most were cases the deterministic modules already handle correctly:
 *
 *   "shirtless cards"        -> o:"shirtless"        (should be atag:shirtless)
 *   "cards with tacos"       -> art:taco             (should be atag:taco)
 *   "banned cards"           -> banned               (invalid on its own)
 *   "mono red monkeyape"     -> o:"monkey" o:"ape"   (stacked, can't co-occur)
 *
 * This module turns the original natural-language query plus the AI output
 * into an ordered list of candidate rewrites. Callers must probe each
 * candidate against Scryfall and only adopt one that actually returns cards,
 * so a bad candidate can never make a search worse.
 *
 * @module semantic-search/ai-repair-candidates
 */

import { SCRYFALL_ART_TAG_SET } from '../_shared/art-tag-vocabulary.ts';
import { matchArtTagQuery } from '../_shared/artTagMatching.ts';
import { resolveSubtypeSlug } from '../_shared/subtypeMatching.ts';

export interface RepairCandidate {
  /** The rewritten Scryfall query to probe. */
  query: string;
  /** Short machine-readable reason, used for logging and telemetry. */
  reason: string;
  /** Human-readable note surfaced to the user when the candidate is adopted. */
  note: string;
}

/** Matches `o:"term"`, `o:term`, `art:"term"` and `art:term` tokens. */
const TEXT_TOKEN_RE = /\b(o|oracle|art):("([^"]+)"|[^\s()"]+)/gi;

const LEGALITY_DEFAULT_FORMAT = 'commander';

function dedupeCandidates(candidates: RepairCandidate[]): RepairCandidate[] {
  const seen = new Set<string>();
  const out: RepairCandidate[] = [];
  for (const candidate of candidates) {
    const key = candidate.query.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(candidate);
  }
  return out;
}

function collectTextTokens(
  aiQuery: string,
): Array<{ match: string; operator: string; term: string }> {
  const tokens: Array<{ match: string; operator: string; term: string }> = [];
  for (const m of aiQuery.matchAll(TEXT_TOKEN_RE)) {
    const term = (m[3] ?? m[2] ?? '').trim();
    if (!term) continue;
    tokens.push({
      match: m[0],
      operator: m[1].toLowerCase(),
      term,
    });
  }
  return tokens;
}

/**
 * `o:"shirtless"` / `art:taco` -> `atag:shirtless` / `atag:taco` when the term
 * is a known Scryfall art tag.
 */
function artTagRewrite(aiQuery: string): RepairCandidate | null {
  if (/\batag:/i.test(aiQuery)) return null;

  let rewritten = aiQuery;
  const replaced: string[] = [];

  for (const token of collectTextTokens(aiQuery)) {
    const slug = token.term.toLowerCase().replace(/\s+/g, '-');
    if (!SCRYFALL_ART_TAG_SET.has(slug)) continue;
    rewritten = rewritten.replace(token.match, `atag:${slug}`);
    replaced.push(slug);
  }

  if (replaced.length === 0) return null;
  return {
    query: rewritten.trim(),
    reason: 'art_tag_rewrite',
    note: `Interpreted as artwork tags: ${replaced.join(', ')}`,
  };
}

/**
 * `o:"monkey" o:"ape"` -> `(t:monkey or t:ape)`. Stacked oracle-text terms are
 * an AND in Scryfall, so multi-tribe phrasings can never match.
 */
function subtypeRewrite(aiQuery: string): RepairCandidate | null {
  const tokens = collectTextTokens(aiQuery).filter(
    (token) => token.operator !== 'art',
  );
  if (tokens.length === 0) return null;

  const resolved = tokens
    .map((token) => ({ token, slug: resolveSubtypeSlug(token.term) }))
    .filter((entry): entry is { token: typeof tokens[number]; slug: string } =>
      entry.slug !== null,
    );
  if (resolved.length === 0) return null;

  let rewritten = aiQuery;
  if (resolved.length === tokens.length && resolved.length > 1) {
    // Every text term is a tribe — the user meant "any of these".
    const orGroup = `(${resolved.map((entry) => `t:${entry.slug}`).join(' or ')})`;
    for (const [index, entry] of resolved.entries()) {
      rewritten = rewritten.replace(entry.token.match, index === 0 ? orGroup : '');
    }
  } else {
    for (const entry of resolved) {
      rewritten = rewritten.replace(entry.token.match, `t:${entry.slug}`);
    }
  }

  const cleaned = rewritten.replace(/\s{2,}/g, ' ').trim();
  if (!cleaned || cleaned === aiQuery.trim()) return null;

  return {
    query: cleaned,
    reason: 'subtype_rewrite',
    note: `Interpreted as creature types: ${resolved
      .map((entry) => entry.slug)
      .join(', ')}`,
  };
}

/**
 * A bare `banned` / `restricted` / `legal` token is not valid Scryfall syntax;
 * it needs a format. Commander is the product default.
 */
function legalityRewrite(
  originalQuery: string,
  aiQuery: string,
): RepairCandidate | null {
  const bare = /(^|\s)(banned|restricted|legal)(?=$|\s)(?!:)/i.exec(aiQuery);
  if (!bare) return null;

  const status = bare[2].toLowerCase();
  const formatMatch =
    /\b(commander|edh|modern|legacy|vintage|pioneer|standard|pauper|brawl)\b/i.exec(
      originalQuery,
    );
  const rawFormat = formatMatch?.[1]?.toLowerCase() ?? LEGALITY_DEFAULT_FORMAT;
  const format = rawFormat === 'edh' ? 'commander' : rawFormat;

  const rewritten = aiQuery
    .replace(bare[0], `${bare[1]}${status}:${format}`)
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    query: rewritten,
    reason: 'legality_format_added',
    note: `Assumed ${format} for "${status}"`,
  };
}

/**
 * "cards like Hermit Druid" must not be split into `t:druid t:hermit`. When we
 * know the phrase names a real card, search the card itself.
 */
function cardLikeRewrite(
  originalQuery: string,
  isKnownCardName: (name: string) => boolean,
): RepairCandidate | null {
  const match = /^\s*(?:cards?|something|anything)\s+(?:like|similar to)\s+(.+?)\s*$/i.exec(
    originalQuery,
  );
  const name = match?.[1]?.trim();
  if (!name || !isKnownCardName(name)) return null;

  return {
    query: `!"${name}"`,
    reason: 'card_name_lookup',
    note: `Matched "${name}" as a card name`,
  };
}

/**
 * Builds the ordered candidate list. Most specific rewrites come first.
 */
export function buildAiRepairCandidates(
  originalQuery: string,
  aiQuery: string,
  options: { isKnownCardName?: (name: string) => boolean } = {},
): RepairCandidate[] {
  const isKnownCardName = options.isKnownCardName ?? (() => false);
  const candidates: RepairCandidate[] = [];

  const cardLike = cardLikeRewrite(originalQuery, isKnownCardName);
  if (cardLike) candidates.push(cardLike);

  const artMatch = matchArtTagQuery(originalQuery);
  if (artMatch && !/\batag:/i.test(aiQuery)) {
    candidates.push({
      query: artMatch.query,
      reason: 'art_tag_query',
      note: `Interpreted as artwork tag: ${artMatch.tag}`,
    });
  }

  const artRewrite = artTagRewrite(aiQuery);
  if (artRewrite) candidates.push(artRewrite);

  const legality = legalityRewrite(originalQuery, aiQuery);
  if (legality) candidates.push(legality);

  const subtype = subtypeRewrite(aiQuery);
  if (subtype) candidates.push(subtype);

  return dedupeCandidates(candidates).filter(
    (candidate) => candidate.query.trim() !== aiQuery.trim(),
  );
}
