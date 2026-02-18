/**
 * Slot Extraction – Types & Subtypes
 * @module pipeline/slots/extract-types
 */

import { CARD_TYPES } from '../../shared-mappings.ts';
import { COMMON_SUBTYPES } from './constants.ts';

/**
 * Extracts type constraints from query, detecting OR patterns
 *
 * Scryfall Syntax Reference:
 * - t:X t:Y = card must have BOTH types (AND)
 * - (t:X or t:Y) = card must have EITHER type (OR)
 * - -t:X = card must NOT have type
 */
export function extractTypes(query: string): {
  types: { include: string[]; includeOr: string[]; exclude: string[] };
  remaining: string;
} {
  let remaining = query;
  const include: string[] = [];
  const includeOr: string[] = [];
  const exclude: string[] = [];

  // Handle "utility lands" → t:land -t:basic
  if (/\butility\s+lands?\b/i.test(remaining)) {
    include.push('land');
    exclude.push('basic');
    remaining = remaining.replace(/\butility\s+lands?\b/gi, '').trim();
  }

  // FIRST: Check for "X or Y" type patterns
  const orPatterns = [
    /\b(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?\s+or\s+(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?\b/gi,
    /\b(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?(?:\s*,\s*(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?)+\s*,?\s*or\s+(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?\b/gi,
  ];

  for (const orPattern of orPatterns) {
    const orMatches = remaining.matchAll(orPattern);
    for (const orMatch of orMatches) {
      const typesInMatch = orMatch[0].match(
        /\b(artifact|creature|instant|sorcery|land|enchantment|planeswalker)/gi,
      );
      if (typesInMatch) {
        for (const t of typesInMatch) {
          const normalized = t.toLowerCase();
          if (!includeOr.includes(normalized)) {
            includeOr.push(normalized);
          }
        }
      }
      remaining = remaining.replace(orMatch[0], '').trim();
    }
  }

  // Handle "spells" as instant OR sorcery
  if (
    /\bspells?\b/i.test(remaining) &&
    !includeOr.includes('instant') &&
    !includeOr.includes('sorcery')
  ) {
    includeOr.push('instant', 'sorcery');
    remaining = remaining.replace(/\bspells?\b/gi, '').trim();
  }

  // Check for negated types
  for (const type of CARD_TYPES) {
    const negPattern = new RegExp(
      `\\b(?:not|isn't|isnt|aren't|arent|no|non[-\\s]?)${type}s?\\b`,
      'gi',
    );
    if (negPattern.test(remaining)) {
      exclude.push(type);
      remaining = remaining.replace(negPattern, '').trim();
    }
  }

  // Check for remaining individual types (AND'd together)
  for (const type of CARD_TYPES) {
    if (includeOr.includes(type)) continue;
    const pattern = new RegExp(`\\b${type}s?\\b`, 'gi');
    if (pattern.test(remaining) && !exclude.includes(type)) {
      // Don't add 'creature' as an AND type when the query is about
      // equipment/auras buffing — "equipped creature" or "enchanted creature"
      // just describes what the equipment/aura affects, not a type filter.
      if (
        type === 'creature' &&
        (includeOr.includes('equipment') || includeOr.includes('aura')) &&
        /\b(equipped|enchanted)\s+creature\b/i.test(query)
      ) {
        remaining = remaining.replace(pattern, '').trim();
        continue;
      }
      include.push(type);
      remaining = remaining.replace(pattern, '').trim();
    }
  }

  return { types: { include, includeOr, exclude }, remaining };
}

export function extractSubtypes(query: string): {
  subtypes: string[];
  remaining: string;
} {
  let remaining = query;
  const subtypes: string[] = [];

  for (const subtype of COMMON_SUBTYPES) {
    const pattern = new RegExp(`\\b${subtype}\\b`, 'gi');
    if (pattern.test(remaining)) {
      const singular = subtype.replace(/s$/, '').replace(/ves$/, 'f');
      if (!subtypes.includes(singular)) {
        subtypes.push(singular);
      }
      remaining = remaining.replace(pattern, '').trim();
    }
  }

  return { subtypes, remaining };
}
