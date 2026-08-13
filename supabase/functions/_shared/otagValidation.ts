/**
 * Validates Scryfall Tagger values before a query is sent to Scryfall:
 *   - otag:/oracletag:/function: against the functional tag vocabulary
 *   - art:/atag:/arttag:      against the art tag vocabulary
 *
 * Hallucinated tags (e.g. `otag:draw-spells`, `atag:heroic-pose`) silently
 * return zero results on Scryfall, which used to look like an "unrepairable"
 * query. Rejecting them up front lets the repair loop feed a precise reason
 * back into the model.
 */
import { SCRYFALL_ORACLE_TAG_SET } from './otag-vocabulary.ts';
import { SCRYFALL_ART_TAG_SET } from './art-tag-vocabulary.ts';

const OTAG_PATTERN = /-?\b(?:otag|oracletag|function):"?([a-z0-9][a-z0-9-]*)"?/gi;
const ATAG_PATTERN = /-?\b(?:art|atag|arttag):"?([a-z0-9][a-z0-9-]*)"?/gi;

/** Extra tags the app relies on that are not literal Scryfall tags. */
const EXTRA_KNOWN_TAGS = new Set<string>(['manarock', 'board-wipe', 'flicker']);

function extract(syntax: string, pattern: RegExp): string[] {
  const tags: string[] = [];
  let match: RegExpExecArray | null;
  pattern.lastIndex = 0;
  while ((match = pattern.exec(syntax)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  return tags;
}

export function extractOtags(syntax: string): string[] {
  return extract(syntax, OTAG_PATTERN);
}

export function extractArtTags(syntax: string): string[] {
  return extract(syntax, ATAG_PATTERN);
}

export function isKnownOracleTag(tag: string): boolean {
  const normalized = tag.toLowerCase().trim();
  return SCRYFALL_ORACLE_TAG_SET.has(normalized) || EXTRA_KNOWN_TAGS.has(normalized);
}

export function isKnownArtTag(tag: string): boolean {
  return SCRYFALL_ART_TAG_SET.has(tag.toLowerCase().trim());
}

/** Returns every otag value in the query that Scryfall does not index. */
export function findUnknownOtags(syntax: string): string[] {
  const unknown = new Set<string>();
  for (const tag of extractOtags(syntax)) {
    if (!isKnownOracleTag(tag)) unknown.add(tag);
  }
  return [...unknown];
}

/** Returns every art tag value in the query that Scryfall does not index. */
export function findUnknownArtTags(syntax: string): string[] {
  const unknown = new Set<string>();
  for (const tag of extractArtTags(syntax)) {
    if (!isKnownArtTag(tag)) unknown.add(tag);
  }
  return [...unknown];
}

function suggestFrom(vocabulary: ReadonlySet<string>, tag: string, limit: number): string[] {
  const needle = tag.toLowerCase().replace(/-/g, '');
  if (!needle) return [];
  const scored: { tag: string; score: number }[] = [];
  for (const candidate of vocabulary) {
    const flat = candidate.replace(/-/g, '');
    if (flat === needle) return [candidate];
    if (flat.startsWith(needle)) scored.push({ tag: candidate, score: 0 });
    else if (flat.includes(needle)) scored.push({ tag: candidate, score: 1 });
    else if (needle.includes(flat) && flat.length >= 4) scored.push({ tag: candidate, score: 2 });
  }
  scored.sort((a, b) => a.score - b.score || a.tag.length - b.tag.length);
  return scored.slice(0, limit).map((entry) => entry.tag);
}

/** Suggests the closest real tags for a hallucinated value (prefix/substring match). */
export function suggestOracleTags(tag: string, limit = 5): string[] {
  return suggestFrom(SCRYFALL_ORACLE_TAG_SET, tag, limit);
}

export function suggestArtTags(tag: string, limit = 5): string[] {
  return suggestFrom(SCRYFALL_ART_TAG_SET, tag, limit);
}

export interface OtagValidationResult {
  valid: boolean;
  unknownTags: string[];
  /** Unknown art tag values, kept separate so callers can report them precisely. */
  unknownArtTags: string[];
  /** Human-readable reason suitable for feeding back into a repair prompt. */
  reason?: string;
}

function describe(tags: string[], prefix: 'otag' | 'atag', suggest: (tag: string) => string[]) {
  return tags.map((tag) => {
    const suggestions = suggest(tag);
    return suggestions.length
      ? `${prefix}:${tag} does not exist (try ${suggestions.map((s) => `${prefix}:${s}`).join(', ')})`
      : `${prefix}:${tag} does not exist`;
  });
}

export function validateOtags(syntax: string): OtagValidationResult {
  const unknownTags = findUnknownOtags(syntax);
  const unknownArtTags = findUnknownArtTags(syntax);
  if (unknownTags.length === 0 && unknownArtTags.length === 0) {
    return { valid: true, unknownTags: [], unknownArtTags: [] };
  }

  const hints = [
    ...describe(unknownTags, 'otag', (tag) => suggestOracleTags(tag)),
    ...describe(unknownArtTags, 'atag', (tag) => suggestArtTags(tag)),
  ].join('; ');

  return {
    valid: false,
    unknownTags,
    unknownArtTags,
    reason: `Invalid Scryfall Tagger value(s): ${hints}`,
  };
}
