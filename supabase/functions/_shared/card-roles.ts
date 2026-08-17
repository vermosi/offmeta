/**
 * Deterministic card role extraction and similarity scoring.
 * Extracts functional "roles" from oracle_text using pattern matching,
 * then scores similarity between cards based on role overlap + type affinity.
 * @module _shared/card-roles
 */

/** Known functional role patterns matched against lowercased oracle_text */
const ROLE_PATTERNS: Array<{ role: string; patterns: string[] }> = [
  {
    role: 'removal',
    patterns: [
      'destroy target',
      'exile target',
      'deals damage to any target',
      'deals damage to target',
    ],
  },
  {
    role: 'board_wipe',
    patterns: [
      'destroy all',
      'exile all',
      'all creatures get -',
      'each creature gets -',
    ],
  },
  {
    role: 'counterspell',
    patterns: [
      'counter target spell',
      'counter target activated',
      'counter target triggered',
    ],
  },
  {
    role: 'draw',
    patterns: ['draw a card', 'draw two card', 'draw cards', 'draws a card'],
  },
  {
    role: 'ramp',
    patterns: [
      'search your library for a basic land',
      'search your library for a land',
      'add {',
      'add one mana',
      'adds one mana',
    ],
  },
  {
    role: 'tutor',
    patterns: ['search your library for a card', 'search your library for a'],
  },
  {
    role: 'recursion',
    patterns: [
      'return target creature card from your graveyard',
      'return from your graveyard',
      'from your graveyard to your hand',
      'from your graveyard to the battlefield',
    ],
  },
  {
    role: 'sacrifice_outlet',
    patterns: [
      'sacrifice a creature',
      'sacrifice another',
      'sacrifice a permanent',
    ],
  },
  {
    role: 'token_generator',
    patterns: ['create a', 'creature token', 'token with'],
  },
  {
    role: 'lifegain',
    patterns: ['you gain life', 'gains that much life', 'gain life equal'],
  },
  {
    role: 'protection',
    patterns: ['hexproof', 'indestructible', 'shroud', 'protection from'],
  },
  {
    role: 'discard',
    patterns: ['discard a card', 'discards a card', 'each opponent discards'],
  },
  { role: 'mill', patterns: ['mills', 'put the top', 'into their graveyard'] },
  {
    role: 'blink',
    patterns: [
      'exile target creature you control, then return',
      'exile it, then return',
      'flicker',
    ],
  },
  { role: 'pump', patterns: ['gets +', 'get +', '+1/+1 counter'] },
  {
    role: 'cost_reduction',
    patterns: [
      'costs {1} less',
      'costs {2} less',
      'cost {1} less',
      'cost less to cast',
      'without paying',
    ],
  },
  {
    role: 'copy',
    patterns: ['copy target', 'becomes a copy', "create a token that's a copy"],
  },
  {
    role: 'land_destruction',
    patterns: ['destroy target land', 'destroy target nonbasic'],
  },
  {
    role: 'equipment',
    patterns: ['equip {', 'equipped creature gets', 'attach'],
  },
  {
    role: 'evasion',
    patterns: [
      "can't be blocked",
      'unblockable',
      'menace',
      'fear',
      'intimidate',
      'shadow',
    ],
  },
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

export interface SimilarRolePair {
  cardA: string;
  cardB: string;
  weight: number;
  sharedRoles: string[];
}

const MAX_ROLE_GROUP_SIZE = 200;
const LARGE_GROUP_NEIGHBOR_WINDOW = 32;
const MANA_DECAY_SCALE = 2;

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
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
export function computeRoleIdfWeights(
  profiles: CardRoleProfile[],
): ReadonlyMap<string, number> {
  const documentFrequency = new Map<string, number>();

  for (const profile of profiles) {
    for (const role of new Set(profile.roles)) {
      documentFrequency.set(role, (documentFrequency.get(role) ?? 0) + 1);
    }
  }

  const weights = new Map<string, number>();
  for (const [role, frequency] of documentFrequency) {
    weights.set(role, Math.log((profiles.length + 1) / (frequency + 1)) + 1);
  }
  return weights;
}

export function computeRoleSimilarity(
  a: CardRoleProfile,
  b: CardRoleProfile,
  roleWeights: ReadonlyMap<string, number> = new Map(),
): number {
  const rolesA = new Set(a.roles);
  const rolesB = new Set(b.roles);
  const sharedRoles = [...rolesA].filter((role) => rolesB.has(role));
  if (sharedRoles.length === 0) return 0;

  const allRoles = new Set([...rolesA, ...rolesB]);
  const roleWeight = (role: string) => roleWeights.get(role) ?? 1;
  const sharedWeight = sharedRoles.reduce(
    (sum, role) => sum + roleWeight(role),
    0,
  );
  const unionWeight = [...allRoles].reduce(
    (sum, role) => sum + roleWeight(role),
    0,
  );
  const roleScore = sharedWeight / unionWeight;

  const typeScore =
    a.typeCategory !== 'unknown' && a.typeCategory === b.typeCategory ? 1 : 0;

  const cmcDiff = Math.abs(a.cmc - b.cmc);
  const manaScore = Number.isFinite(cmcDiff)
    ? Math.exp(-cmcDiff / MANA_DECAY_SCALE)
    : 0;

  const colorsA = new Set(a.colors);
  const colorsB = new Set(b.colors);
  const allColors = new Set([...colorsA, ...colorsB]);
  const sharedColorCount = [...colorsA].filter((color) =>
    colorsB.has(color),
  ).length;
  const colorScore = allColors.size > 0 ? sharedColorCount / allColors.size : 1;

  const raw =
    roleScore * 0.6 + typeScore * 0.2 + colorScore * 0.1 + manaScore * 0.1;
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
): SimilarRolePair[] {
  if (maxPairsPerCard <= 0) return [];

  // Build role -> card index
  const roleIndex = new Map<string, CardRoleProfile[]>();
  for (const p of profiles) {
    for (const role of new Set(p.roles)) {
      const existing = roleIndex.get(role) ?? [];
      existing.push(p);
      roleIndex.set(role, existing);
    }
  }

  const roleWeights = computeRoleIdfWeights(profiles);
  const candidateKeys = new Set<string>();

  for (const group of roleIndex.values()) {
    const orderedGroup = [
      ...new Map(group.map((profile) => [profile.oracle_id, profile])).values(),
    ].sort(
      (a, b) =>
        compareIds(a.typeCategory, b.typeCategory) ||
        a.cmc - b.cmc ||
        compareIds(a.colors.join(''), b.colors.join('')) ||
        compareIds(a.oracle_id, b.oracle_id),
    );

    const comparisonWindow =
      orderedGroup.length <= MAX_ROLE_GROUP_SIZE
        ? orderedGroup.length
        : LARGE_GROUP_NEIGHBOR_WINDOW + 1;
    for (let i = 0; i < orderedGroup.length; i++) {
      const upperBound = Math.min(orderedGroup.length, i + comparisonWindow);
      for (let j = i + 1; j < upperBound; j++) {
        const [cardA, cardB] = [
          orderedGroup[i].oracle_id,
          orderedGroup[j].oracle_id,
        ].sort(compareIds);
        candidateKeys.add(`${cardA}|${cardB}`);
      }
    }
  }

  const profilesById = new Map(
    profiles.map((profile) => [profile.oracle_id, profile]),
  );
  const candidates: SimilarRolePair[] = [];
  for (const key of candidateKeys) {
    const [cardA, cardB] = key.split('|');
    const a = profilesById.get(cardA);
    const b = profilesById.get(cardB);
    if (!a || !b) continue;

    const weight = computeRoleSimilarity(a, b, roleWeights);
    if (weight < minWeight) continue;

    const rolesB = new Set(b.roles);
    const sharedRoles = [...new Set(a.roles)]
      .filter((role) => rolesB.has(role))
      .sort();
    candidates.push({ cardA, cardB, weight, sharedRoles });
  }

  candidates.sort(
    (a, b) =>
      b.weight - a.weight ||
      compareIds(a.cardA, b.cardA) ||
      compareIds(a.cardB, b.cardB),
  );

  const degrees = new Map<string, number>();
  return candidates.filter(({ cardA, cardB }) => {
    const degreeA = degrees.get(cardA) ?? 0;
    const degreeB = degrees.get(cardB) ?? 0;
    if (degreeA >= maxPairsPerCard || degreeB >= maxPairsPerCard) return false;
    degrees.set(cardA, degreeA + 1);
    degrees.set(cardB, degreeB + 1);
    return true;
  });
}
