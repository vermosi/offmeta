/**
 * Pipeline Stage: Query Conflict Detection
 *
 * Detects and resolves conflicts in assembled queries:
 * - Redundant type constraints (t:artifact + (t:artifact or t:land))
 * - Impossible type combinations (t:artifact t:sorcery t:instant)
 * - Contradictory constraints (otag:ramp -otag:ramp)
 * - Duplicate clauses
 *
 * Scryfall Syntax Reference:
 * - t:X t:Y = card must have BOTH types (AND) - impossible for most combos
 * - (t:X or t:Y) = card must have EITHER type (OR)
 * - -t:X = card must NOT have type
 * - otag:X = has oracle tag X
 * - -otag:X = does NOT have oracle tag X
 */

// Card types that are mutually exclusive (a card can't be both)
const MUTUALLY_EXCLUSIVE_TYPES = [
  ['artifact', 'instant'],
  ['artifact', 'sorcery'],
  ['creature', 'instant'],
  ['creature', 'sorcery'],
  ['land', 'instant'],
  ['land', 'sorcery'],
  ['enchantment', 'instant'],
  ['enchantment', 'sorcery'],
  ['planeswalker', 'instant'],
  ['planeswalker', 'sorcery'],
  // Note: artifact creature, artifact land, enchantment creature ARE valid
];

export interface ConflictDetectionResult {
  conflicts: string[];
  deduplicated: string[];
  warnings: string[];
}

/**
 * Detects query conflicts and returns deduplicated parts
 *
 * This is critical for preventing impossible queries like:
 * - t:artifact t:instant t:sorcery (impossible - can't be all three)
 * - t:artifact (t:artifact or t:land) (redundant)
 */
export function detectQueryConflicts(parts: string[]): ConflictDetectionResult {
  const conflicts: string[] = [];
  const warnings: string[] = [];
  let deduplicated = [...parts];

  // Extract type information
  const simpleTypes: string[] = [];
  const orGroupTypes: string[] = [];
  const excludedTypes: string[] = [];
  const orGroups: string[] = [];

  for (const part of parts) {
    // Simple type: t:artifact
    const simpleMatch = part.match(/^t:(\w+)$/);
    if (simpleMatch) {
      simpleTypes.push(simpleMatch[1].toLowerCase());
      continue;
    }

    // Excluded type: -t:creature
    const excludeMatch = part.match(/^-t:(\w+)$/);
    if (excludeMatch) {
      excludedTypes.push(excludeMatch[1].toLowerCase());
      continue;
    }

    // OR group: (t:artifact or t:land)
    if (part.includes(' or ') && part.includes('t:')) {
      orGroups.push(part);
      const typeMatches = part.match(/t:(\w+)/g);
      if (typeMatches) {
        orGroupTypes.push(...typeMatches.map((m) => m.slice(2).toLowerCase()));
      }
    }
  }

  // Check 1: Remove simple types that are redundant with OR groups
  // If we have (t:artifact or t:land) AND t:artifact, the simple t:artifact is redundant
  // AND creates an impossible constraint (must be BOTH artifact AND (artifact OR land))
  const redundantSimpleTypes = simpleTypes.filter((t) =>
    orGroupTypes.includes(t),
  );
  if (redundantSimpleTypes.length > 0) {
    conflicts.push(
      `Removed redundant type constraints: ${redundantSimpleTypes.join(', ')}`,
    );
    deduplicated = deduplicated.filter((p) => {
      const match = p.match(/^t:(\w+)$/);
      if (match && redundantSimpleTypes.includes(match[1].toLowerCase())) {
        return false;
      }
      return true;
    });
  }

  // Check 2: Detect impossible AND combinations among remaining simple types
  // If we have t:artifact t:instant, that's impossible (a card can't be both)
  const remainingSimpleTypes = simpleTypes.filter(
    (t) => !redundantSimpleTypes.includes(t),
  );
  const impossibleCombinations: string[][] = [];

  for (const [type1, type2] of MUTUALLY_EXCLUSIVE_TYPES) {
    if (
      remainingSimpleTypes.includes(type1) &&
      remainingSimpleTypes.includes(type2)
    ) {
      impossibleCombinations.push([type1, type2]);
      warnings.push(
        `Impossible combination: cards cannot be both ${type1} AND ${type2}`,
      );
    }
  }

  // If we found impossible combinations, try to convert them to OR
  if (impossibleCombinations.length > 0) {
    // Collect all types involved in impossible combinations
    const typesToConvert = new Set<string>();
    for (const [t1, t2] of impossibleCombinations) {
      typesToConvert.add(t1);
      typesToConvert.add(t2);
    }

    // Remove the individual t:X entries
    deduplicated = deduplicated.filter((p) => {
      const match = p.match(/^t:(\w+)$/);
      if (match && typesToConvert.has(match[1].toLowerCase())) {
        return false;
      }
      return true;
    });

    // Add an OR group instead
    const orParts = [...typesToConvert].map((t) => `t:${t}`);
    deduplicated.push(`(${orParts.join(' or ')})`);
    conflicts.push(
      `Converted impossible AND to OR: ${[...typesToConvert].join(', ')}`,
    );
  }

  // Check 3: Remove duplicate OR groups
  const seenOrGroups = new Set<string>();
  deduplicated = deduplicated.filter((part) => {
    if (part.includes(' or ') && part.includes('t:')) {
      // Normalize the OR group for comparison (sort types alphabetically)
      const typeMatches = part.match(/t:(\w+)/g);
      if (typeMatches) {
        const normalized = typeMatches
          .map((m) => m.toLowerCase())
          .sort()
          .join('|');
        if (seenOrGroups.has(normalized)) {
          return false;
        }
        seenOrGroups.add(normalized);
      }
    }
    return true;
  });

  // Check 4: Detect and remove contradictory tag constraints (otag:X and -otag:X)
  const includedTags = new Set<string>();
  const excludedTags = new Set<string>();

  for (const part of deduplicated) {
    const includeTagMatch = part.match(/^otag:([a-z-]+)$/i);
    if (includeTagMatch) {
      includedTags.add(includeTagMatch[1].toLowerCase());
    }
    const excludeTagMatch = part.match(/^-otag:([a-z-]+)$/i);
    if (excludeTagMatch) {
      excludedTags.add(excludeTagMatch[1].toLowerCase());
    }
  }

  // Find tags that are both included and excluded - remove the contradictory pair
  for (const tag of excludedTags) {
    if (includedTags.has(tag)) {
      conflicts.push(
        `Removed contradictory tag constraint: otag:${tag} and -otag:${tag}`,
      );
      // Keep only the positive tag, remove the negative (user usually means positive)
      deduplicated = deduplicated.filter(
        (p) => p.toLowerCase() !== `-otag:${tag}`,
      );
    }
  }

  // Check 5: Remove exact duplicates
  const seen = new Set<string>();
  deduplicated = deduplicated.filter((part) => {
    const normalized = part.toLowerCase();
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });

  // Check 6: Detect contradictory constraints (type AND -type)
  for (const type of excludedTypes) {
    if (simpleTypes.includes(type) || orGroupTypes.includes(type)) {
      warnings.push(
        `Contradictory constraint: both includes and excludes type "${type}"`,
      );
      // Remove the contradictory positive type when user explicitly negated
      deduplicated = deduplicated.filter((p) => {
        const match = p.match(/^t:(\w+)$/);
        if (match && match[1].toLowerCase() === type) {
          return false; // User said NOT this type, so remove positive
        }
        return true;
      });
      conflicts.push(
        `Removed contradictory type constraint: t:${type} when -t:${type} present`,
      );
    }
  }

  return { conflicts, deduplicated, warnings };
}

/**
 * Removes type constraints from concept templates when types are already specified
 * This prevents duplication when user says "artifacts that add mana" and concept adds t:artifact
 */
export function filterConceptTemplateTypes(
  template: string,
  existingTypes: { include: string[]; includeOr: string[] },
): string {
  const allExistingTypes = [
    ...existingTypes.include,
    ...existingTypes.includeOr,
  ];

  if (allExistingTypes.length === 0) {
    return template;
  }

  let filtered = template;

  // Remove simple type constraints that match existing types
  for (const type of allExistingTypes) {
    const simpleTypePattern = new RegExp(`\\bt:${type}\\b\\s*`, 'gi');
    filtered = filtered.replace(simpleTypePattern, '');
  }

  // Clean up whitespace
  filtered = filtered.replace(/\s+/g, ' ').trim();

  return filtered;
}

/**
 * Checks if a query has multiple AND'd types that should be OR'd
 * Returns true if the query looks like it has impossible type combinations
 */
export function hasImpossibleTypeCombination(query: string): boolean {
  const simpleTypeMatches = query.match(/\bt:(\w+)\b/g);
  if (!simpleTypeMatches || simpleTypeMatches.length < 2) {
    return false;
  }

  const types = simpleTypeMatches.map((m) => m.slice(2).toLowerCase());

  // Check if any pair is mutually exclusive
  for (const [type1, type2] of MUTUALLY_EXCLUSIVE_TYPES) {
    if (types.includes(type1) && types.includes(type2)) {
      return true;
    }
  }

  return false;
}
