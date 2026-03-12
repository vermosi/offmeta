/**
 * Deterministic card role extraction and similarity scoring.
 * Extracts functional "roles" from oracle_text using pattern matching,
 * then scores similarity between cards based on role overlap + type affinity.
 * @module _shared/card-roles
 */

/** Known functional role patterns matched against lowercased oracle_text */
const ROLE_PATTERNS: Array<{ role: string; patterns: string[] }> = [
  { role: 'removal', patterns: ['destroy target', 'exile target', 'deals damage to any target', 'deals damage to target'] },
  { role: 'board_wipe', patterns: ['destroy all', 'exile all', 'all creatures get -', 'each creature gets -'] },
  { role: 'counterspell', patterns: ['counter target spell', 'counter target activated', 'counter target triggered'] },
  { role: 'draw', patterns: ['draw a card', 'draw two card', 'draw cards', 'draws a card'] },
  { role: 'ramp', patterns: ['search your library for a basic land', 'search your library for a land', 'add {', 'add one mana', 'adds one mana'] },
  { role: 'tutor', patterns: ['search your library for a card', 'search your library for a'] },
  { role: 'recursion', patterns: ['return target creature card from your graveyard', 'return from your graveyard', 'from your graveyard to your hand', 'from your graveyard to the battlefield'] },
  { role: 'sacrifice_outlet', patterns: ['sacrifice a creature', 'sacrifice another', 'sacrifice a permanent'] },
  { role: 'token_generator', patterns: ['create a', 'creature token', 'token with'] },
  { role: 'lifegain', patterns: ['you gain life', 'gains that much life', 'gain life equal'] },
  { role: 'protection', patterns: ['hexproof', 'indestructible', 'shroud', 'protection from'] },
  { role: 'discard', patterns: ['discard a card', 'discards a card', 'each opponent discards'] },
  { role: 'mill', patterns: ['mills', 'put the top', 'into their graveyard'] },
  { role: 'blink', patterns: ['exile target creature you control, then return', 'exile it, then return', 'flicker'] },
  { role: 'pump', patterns: ['gets +', 'get +', '+1/+1 counter'] },
  { role: 'cost_reduction', patterns: ['costs {1} less', 'costs {2} less', 'cost {1} less', 'cost less to cast', 'without paying'] },
  { role: 'copy', patterns: ['copy target', 'becomes a copy', 'create a token that\'s a copy'] },
  { role: 'land_destruction', patterns: ['destroy target land', 'destroy target nonbasic'] },
  { role: 'equipment', patterns: ['equip {', 'equipped creature gets', 'attach'] },
  { role: 'evasion', patterns: ['can\'t be blocked', 'unblockable', 'menace', 'fear', 'intimidate', 'shadow'] },
];

/** Broad type categories extracted from type_line */
const TYPE_CATEGORIES: Array<{ category: string; patterns: string[] }> = [
  { category: 'creature', patterns: ['creature'] },
  { category: 'instant', patterns: ['instant'] },
  { category: 'sorcery', patterns: ['sorcery'] },
  { category: 'enchantment', patterns: ['enchantment'] },
  { category: 'artifact', patterns: ['artifact'] },
  { category: 'planeswalker', patterns: ['planeswalker'] },
  { category: 'land', patterns: ['land'] },
];

export interface CardForRoles {
  oracle_id: string;
  name: string;
  oracle_text: string | null;
  type_line: string | null;
  cmc: number;
  colors: string[];
}

export interface CardRoleProfile {
  oracle_id: string;
  name: string;
  roles: string[];
  typeCategory: string;
  cmc: number;
  colors: string[];
}

/**
 * Extract functional roles from a card's oracle_text.
 * Pure, deterministic, no external dependencies.
 */
export function extractRoles(oracleText: string | null): string[] {
  if (!oracleText) return [];
  const lower = oracleText.toLowerCase();
  const matched: string[] = [];

  for (const { role, patterns } of ROLE_PATTERNS) {
    for (const pattern of patterns) {
      if (lower.includes(pattern)) {
        matched.push(role);
        break; // one match per role is enough
      }
    }
  }

  return matched;
}

/**
 * Extract broad type category from type_line.
 */
export function extractTypeCategory(typeLine: string | null): string {
  if (!typeLine) return 'unknown';
  const lower = typeLine.toLowerCase();
  for (const { category, patterns } of TYPE_CATEGORIES) {
    for (const pattern of patterns) {
      if (lower.includes(pattern)) return category;
    }
  }
  return 'unknown';
}

/**
 * Build a role profile for a card.
 */
export function buildRoleProfile(card: CardForRoles): CardRoleProfile {
  return {
    oracle_id: card.oracle_id,
    name: card.name,
    roles: extractRoles(card.oracle_text),
    typeCategory: extractTypeCategory(card.type_line),
    cmc: card.cmc,
    colors: card.colors,
  };
}

/**
 * Compute similarity score between two cards based on role overlap,
 * type affinity, and CMC proximity.
 *
 * Returns 0–1 where 1 = identical functional profile.
 */
export function computeRoleSimilarity(a: CardRoleProfile, b: CardRoleProfile): number {
  // Must share at least one role
  const sharedRoles = a.roles.filter((r) => b.roles.includes(r));
  if (sharedRoles.length === 0) return 0;

  const allRoles = new Set([...a.roles, ...b.roles]);
  // Jaccard index for role overlap
  const roleScore = sharedRoles.length / allRoles.size;

  // Type bonus: same broad type = 0.2 bonus
  const typeBonus = a.typeCategory === b.typeCategory ? 0.2 : 0;

  // CMC proximity: penalize large CMC gaps (max 0.1 penalty)
  const cmcDiff = Math.abs(a.cmc - b.cmc);
  const cmcPenalty = Math.min(cmcDiff * 0.02, 0.1);

  // Color overlap bonus (up to 0.1)
  const sharedColors = a.colors.filter((c) => b.colors.includes(c));
  const allColors = new Set([...a.colors, ...b.colors]);
  const colorBonus = allColors.size > 0 ? (sharedColors.length / allColors.size) * 0.1 : 0;

  const raw = roleScore * 0.6 + typeBonus + colorBonus - cmcPenalty;
  return Math.max(0, Math.min(raw, 1));
}

/**
 * Given a list of card role profiles, find significant similar_role pairs.
 * Groups cards by role to avoid O(n²) over the full set.
 * Returns pairs with weight >= minWeight.
 */
export function findSimilarRolePairs(
  profiles: CardRoleProfile[],
  minWeight = 0.3,
  maxPairsPerCard = 10,
): Array<{ cardA: string; cardB: string; weight: number; sharedRoles: string[] }> {
  // Build role -> card index
  const roleIndex = new Map<string, CardRoleProfile[]>();
  for (const p of profiles) {
    for (const role of p.roles) {
      const existing = roleIndex.get(role) ?? [];
      existing.push(p);
      roleIndex.set(role, existing);
    }
  }

  // Track best pairs per card to limit output
  const pairMap = new Map<string, { weight: number; sharedRoles: string[] }>();
  const cardPairCounts = new Map<string, number>();

  for (const [, group] of roleIndex) {
    // Skip very large groups (generic roles like "draw") — cap at 200
    if (group.length > 200) continue;

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        // Skip self
        if (a.oracle_id === b.oracle_id) continue;

        const key = a.oracle_id < b.oracle_id
          ? `${a.oracle_id}|${b.oracle_id}`
          : `${b.oracle_id}|${a.oracle_id}`;

        // Skip if already computed
        if (pairMap.has(key)) continue;

        const weight = computeRoleSimilarity(a, b);
        if (weight < minWeight) continue;

        // Respect per-card limits
        const countA = cardPairCounts.get(a.oracle_id) ?? 0;
        const countB = cardPairCounts.get(b.oracle_id) ?? 0;
        if (countA >= maxPairsPerCard && countB >= maxPairsPerCard) continue;

        const sharedRoles = a.roles.filter((r) => b.roles.includes(r));
        pairMap.set(key, { weight, sharedRoles });
        cardPairCounts.set(a.oracle_id, countA + 1);
        cardPairCounts.set(b.oracle_id, countB + 1);
      }
    }
  }

  const results: Array<{ cardA: string; cardB: string; weight: number; sharedRoles: string[] }> = [];
  for (const [key, value] of pairMap) {
    const [cardA, cardB] = key.split('|');
    results.push({ cardA, cardB, ...value });
  }

  return results.sort((a, b) => b.weight - a.weight);
}
