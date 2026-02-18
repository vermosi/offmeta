/**
 * Deterministic Translation – IR Renderer
 * Converts the intermediate representation to a Scryfall query string.
 * @module deterministic/render
 */

import type { SearchIR } from './types.ts';

/**
 * Renders the intermediate representation to a Scryfall query string
 *
 * CRITICAL: Prevents duplicate type constraints by:
 * 1. Collecting all types mentioned in OR groups (specials)
 * 2. Only adding AND types (ir.types) if they're not already in an OR group
 * 3. Deduplicating the final output
 */
export function renderIR(ir: SearchIR): string {
  const parts: string[] = [];

  if (ir.monoColor) {
    parts.push(`c=${ir.monoColor}`);
    parts.push(`id=${ir.monoColor}`);
  } else if (ir.colorConstraint) {
    const { values, mode, operator } = ir.colorConstraint;
    const prefix = mode === 'identity' ? 'id' : 'c';
    const joined = values.join('');

    if (operator === 'or' && values.length > 1) {
      // "white or black" → (c:w or c:b) — includes, not exact
      const orParts = values.map((color) => `${prefix}:${color}`);
      parts.push(`(${orParts.join(' or ')})`);
    } else if (operator === 'within') {
      parts.push(`id<=${joined}`);
    } else if (operator === 'exact') {
      parts.push(`${prefix}=${joined}`);
    } else if (operator === 'include') {
      // Single color "includes" → c:w (card must contain that color)
      parts.push(`${prefix}:${joined}`);
    } else if (operator === 'and' && mode === 'color') {
      // "blue and green" → c:ug (must include both colors, not exactly those two)
      parts.push(`${prefix}:${joined}`);
    } else {
      parts.push(`${prefix}=${joined}`);
    }
  }

  // Collect types that are in OR groups to avoid duplication
  const typesInOrGroups = new Set<string>();
  for (const special of ir.specials) {
    const typeMatches = special.match(/t:(\w+)/g);
    if (typeMatches) {
      typeMatches.forEach((m) => typesInOrGroups.add(m.slice(2).toLowerCase()));
    }
  }

  // Only add AND types that aren't already in OR groups
  for (const type of ir.types) {
    if (!typesInOrGroups.has(type.toLowerCase())) {
      parts.push(`t:${type}`);
    }
  }

  for (const subtype of ir.subtypes) {
    parts.push(`t:${subtype}`);
  }

  // Don't add excluded types that are in OR groups
  for (const type of ir.excludedTypes) {
    if (!typesInOrGroups.has(type.toLowerCase())) {
      parts.push(`-t:${type}`);
    }
  }

  for (const numeric of ir.numeric) {
    parts.push(`${numeric.field}${numeric.op}${numeric.value}`);
  }

  if (ir.colorCountConstraint) {
    parts.push(
      `${ir.colorCountConstraint.field}${ir.colorCountConstraint.op}${ir.colorCountConstraint.value}`,
    );
  }

  parts.push(...ir.tags);
  parts.push(...ir.artTags);
  parts.push(...ir.specials);
  parts.push(...ir.oracle);

  // Deduplicate parts while preserving order
  const seen = new Set<string>();
  const uniqueParts = parts.filter((part) => {
    const normalized = part.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });

  return uniqueParts.join(' ').replace(/\s+/g, ' ').trim();
}
