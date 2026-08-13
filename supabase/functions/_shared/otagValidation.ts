/**
 * Validates otag:/oracletag:/function: values against the canonical Scryfall
 * Tagger vocabulary before a query is sent to Scryfall.
 *
 * Hallucinated tags (e.g. `otag:draw-spells`) silently return zero results on
 * Scryfall, which used to look like an "unrepairable" query. Rejecting them up
 * front lets the repair loop feed a precise reason back into the model.
 */
import { SCRYFALL_ORACLE_TAG_SET } from './otag-vocabulary.ts';

const OTAG_PATTERN = /\b(?:otag|oracletag|function):"?([a-z0-9][a-z0-9-]*)"?/gi;

/** Extra tags the app relies on that are not literal Scryfall tags. */
const EXTRA_KNOWN_TAGS = new Set<string>(['manarock', 'board-wipe', 'flicker']);

export function extractOtags(syntax: string): string[] {
  const tags: string[] = [];
  let match: RegExpExecArray | null;
  OTAG_PATTERN.lastIndex = 0;
  while ((match = OTAG_PATTERN.exec(syntax)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  return tags;
}

export function isKnownOracleTag(tag: string): boolean {
  const normalized = tag.toLowerCase().trim();
  return SCRYFALL_ORACLE_TAG_SET.has(normalized) || EXTRA_KNOWN_TAGS.has(normalized);
}

/** Returns every otag value in the query that Scryfall does not index. */
export function findUnknownOtags(syntax: string): string[] {
  const unknown = new Set<string>();
  for (const tag of extractOtags(syntax)) {
    if (!isKnownOracleTag(tag)) unknown.add(tag);
  }
  return [...unknown];
}

/** Suggests the closest real tags for a hallucinated value (prefix/substring match). */
export function suggestOracleTags(tag: string, limit = 5): string[] {
  const needle = tag.toLowerCase().replace(/-/g, '');
  if (!needle) return [];
  const scored: { tag: string; score: number }[] = [];
  for (const candidate of SCRYFALL_ORACLE_TAG_SET) {
    const flat = candidate.replace(/-/g, '');
    if (flat === needle) return [candidate];
    if (flat.startsWith(needle)) scored.push({ tag: candidate, score: 0 });
    else if (flat.includes(needle)) scored.push({ tag: candidate, score: 1 });
    else if (needle.includes(flat) && flat.length >= 4) scored.push({ tag: candidate, score: 2 });
  }
  scored.sort((a, b) => a.score - b.score || a.tag.length - b.tag.length);
  return scored.slice(0, limit).map((entry) => entry.tag);
}

export interface OtagValidationResult {
  valid: boolean;
  unknownTags: string[];
  /** Human-readable reason suitable for feeding back into a repair prompt. */
  reason?: string;
}

export function validateOtags(syntax: string): OtagValidationResult {
  const unknownTags = findUnknownOtags(syntax);
  if (unknownTags.length === 0) return { valid: true, unknownTags: [] };

  const hints = unknownTags
    .map((tag) => {
      const suggestions = suggestOracleTags(tag);
      return suggestions.length
        ? `otag:${tag} does not exist (try ${suggestions.map((s) => `otag:${s}`).join(', ')})`
        : `otag:${tag} does not exist`;
    })
    .join('; ');

  return {
    valid: false,
    unknownTags,
    reason: `Invalid Scryfall oracle tag(s): ${hints}`,
  };
}
