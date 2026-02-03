/**
 * Stage 5: Query Assembly
 * Combines slots and concepts into a valid Scryfall query
 *
 * SCRYFALL SYNTAX REFERENCE (from docs):
 * ========================================
 * TYPE CONSTRAINTS:
 * - t:X t:Y = card must have BOTH types (AND)
 *   Example: t:artifact t:creature → finds artifact creatures
 *   WARNING: t:artifact t:instant is impossible!
 *
 * - (t:X or t:Y) = card must have EITHER type (OR)
 *   Example: (t:artifact or t:land) → finds artifacts OR lands
 *
 * - -t:X = card must NOT have type (NOT)
 *   Example: -t:creature → excludes all creatures
 *
 * COLOR CONSTRAINTS:
 * - c:X = card color (actual mana symbols on card)
 * - ci:X = color identity (for commander)
 * - ci<=X = fits within color identity (most common for commander)
 *
 * ORACLE TAGS:
 * - otag:ramp, otag:board-wipe, otag:card-draw, etc.
 * - These are community-maintained tags on Scryfall
 */

import type { ExtractedSlots, ConceptMatch, AssembledQuery } from './types.ts';
import { filterConceptTemplateTypes } from './conflicts.ts';

/**
 * Assembles a Scryfall query from extracted slots and matched concepts
 */
export function assembleQuery(
  slots: ExtractedSlots,
  concepts: ConceptMatch[],
  options: {
    maxQueryLength?: number;
  } = {},
): AssembledQuery {
  const { maxQueryLength = 400 } = options;
  const parts: string[] = [];
  const conceptsApplied: string[] = [];
  const warnings: string[] = [];

  // 1. Format (highest priority)
  if (slots.format) {
    parts.push(`f:${slots.format}`);
  }

  // 2. Colors
  if (slots.colors) {
    const colorQuery = buildColorQuery(slots.colors);
    if (colorQuery) {
      parts.push(colorQuery);
    }
  }

  // 3. Types - handle OR vs AND correctly
  // CRITICAL: Never output both "t:artifact t:land" AND "(t:artifact or t:land)"

  // 3a. Handle OR'd types first: (t:artifact or t:land)
  if (slots.types.includeOr && slots.types.includeOr.length > 0) {
    if (slots.types.includeOr.length === 1) {
      // Single type, no OR needed
      parts.push(`t:${slots.types.includeOr[0]}`);
    } else {
      // Multiple OR'd types: (t:artifact or t:land)
      const orParts = slots.types.includeOr.map((t) => `t:${t}`);
      parts.push(`(${orParts.join(' or ')})`);
    }
  }

  // 3b. Handle AND'd types (must have ALL)
  if (slots.types.include.length > 0) {
    // Filter out types that are already in the OR group to prevent duplication
    const andTypes = slots.types.include.filter(
      (t) => !slots.types.includeOr?.includes(t),
    );

    // Special case: instant + sorcery together usually means "spells" = OR not AND
    if (andTypes.includes('instant') && andTypes.includes('sorcery')) {
      parts.push('(t:instant or t:sorcery)');
      // Remove from andTypes so we don't add them again
      const filteredAndTypes = andTypes.filter(
        (t) => t !== 'instant' && t !== 'sorcery',
      );
      for (const type of filteredAndTypes) {
        parts.push(`t:${type}`);
      }
    } else {
      // Add remaining AND types
      for (const type of andTypes) {
        parts.push(`t:${type}`);
      }
    }
  }

  // 3c. Handle excluded types
  for (const type of slots.types.exclude) {
    parts.push(`-t:${type}`);
  }

  // 4. Subtypes
  for (const subtype of slots.subtypes) {
    parts.push(`t:${subtype}`);
  }

  // 5. Numeric constraints
  if (slots.mv) {
    parts.push(`mv${slots.mv.op}${slots.mv.value}`);
  }
  if (slots.power) {
    parts.push(`pow${slots.power.op}${slots.power.value}`);
  }
  if (slots.toughness) {
    parts.push(`tou${slots.toughness.op}${slots.toughness.value}`);
  }
  if (slots.year) {
    parts.push(`year${slots.year.op}${slots.year.value}`);
  }
  if (slots.price) {
    parts.push(`usd${slots.price.op}${slots.price.value}`);
  }

  // 6. Rarity
  if (slots.rarity) {
    parts.push(`r:${slots.rarity}`);
  }

  // 7. Concept templates (sorted by priority)
  // IMPORTANT: Filter out type constraints from concepts if types are already specified
  // This prevents duplication like "t:artifact otag:manarock t:artifact"
  const sortedConcepts = [...concepts].sort((a, b) => b.priority - a.priority);

  for (const concept of sortedConcepts) {
    // Check if adding this would exceed length
    let template = concept.templates[0];

    // Filter out redundant type constraints from the concept template
    // If user said "artifacts that add mana", don't let concept add another t:artifact
    template = filterConceptTemplateTypes(template, {
      include: slots.types.include,
      includeOr: slots.types.includeOr || [],
    });

    // Skip if template is empty after filtering
    if (!template.trim()) {
      warnings.push(
        `Skipped concept "${concept.conceptId}" - types already specified`,
      );
      continue;
    }

    const tentativeQuery = [...parts, template].join(' ');

    if (tentativeQuery.length > maxQueryLength) {
      warnings.push(
        `Skipped concept "${concept.conceptId}" due to query length limit`,
      );
      continue;
    }

    parts.push(template);
    conceptsApplied.push(concept.conceptId);

    // Add negative templates
    for (const negative of concept.negativeTemplates) {
      const withNegative = [...parts, negative].join(' ');
      if (withNegative.length <= maxQueryLength) {
        parts.push(negative);
      }
    }
  }

  // 8. Tags
  for (const tag of slots.tags) {
    parts.push(tag);
  }

  // 9. Specials
  for (const special of slots.specials) {
    parts.push(special);
  }

  // 10. Include text patterns
  for (const text of slots.includeText) {
    parts.push(`o:"${text}"`);
  }

  // 11. Exclude text patterns
  for (const text of slots.excludeText) {
    parts.push(`-o:"${text}"`);
  }

  // Build final query
  let query = parts.join(' ').trim();

  // Clean up duplicates
  query = removeDuplicateParts(query);

  // Ensure proper parentheses
  query = normalizeParentheses(query);

  // Truncate if needed
  if (query.length > maxQueryLength) {
    query = query.substring(0, maxQueryLength);
    warnings.push('Query truncated to maximum length');
  }

  return {
    query,
    parts,
    conceptsApplied,
    warnings,
  };
}

function buildColorQuery(
  colors: NonNullable<ExtractedSlots['colors']>,
): string {
  const { values, mode, operator } = colors;
  const prefix = mode === 'identity' ? 'ci' : 'c';
  const joined = values.join('');

  if (values.length === 0) return '';

  switch (operator) {
    case 'or':
      if (values.length === 1) {
        return `${prefix}:${values[0]}`;
      }
      return `(${values.map((c) => `${prefix}:${c}`).join(' or ')})`;

    case 'within':
      return `${prefix}<=${joined}`;

    case 'exact':
      return `${prefix}=${joined}`;

    case 'include':
      return `${prefix}>=${joined}`;

    case 'and':
    default:
      if (values.length === 1) {
        return `${prefix}:${values[0]}`;
      }
      return `${prefix}:${joined}`;
  }
}

function removeDuplicateParts(query: string): string {
  const parts = query.split(/\s+/);
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const part of parts) {
    const normalized = part.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(part);
    }
  }

  return unique.join(' ');
}

function normalizeParentheses(query: string): string {
  // Count parentheses
  let openCount = 0;
  let closeCount = 0;

  for (const char of query) {
    if (char === '(') openCount++;
    if (char === ')') closeCount++;
  }

  // Add missing closing parens
  if (openCount > closeCount) {
    query += ')'.repeat(openCount - closeCount);
  }

  // Remove excess closing parens (simple approach)
  if (closeCount > openCount) {
    let excess = closeCount - openCount;
    query = query.replace(/\)/g, (match) => {
      if (excess > 0) {
        excess--;
        return '';
      }
      return match;
    });
  }

  return query;
}

/**
 * Applies external filters to a query (format, color identity from UI)
 */
export function applyExternalFilters(
  query: string,
  filters?: {
    format?: string;
    colorIdentity?: string[];
    maxCmc?: number;
  },
): string {
  if (!filters) return query;

  const additions: string[] = [];

  if (filters.format && !query.includes('f:')) {
    additions.push(`f:${filters.format}`);
  }

  if (filters.colorIdentity?.length && !query.includes('ci')) {
    const identity = filters.colorIdentity.join('').toLowerCase();
    additions.push(`ci<=${identity}`);
  }

  if (filters.maxCmc !== undefined && !query.includes('mv')) {
    additions.push(`mv<=${filters.maxCmc}`);
  }

  if (additions.length === 0) return query;

  return `${query} ${additions.join(' ')}`.trim();
}
