interface SimilarityRequest {
  cardName: string;
  typeLine: string;
  colorIdentity?: string[];
  cmc?: number;
  prices?: { usd?: string | null };
  keywords?: string[];
  explicitMaxPrice?: number;
}

export type QueryPlanStrategy =
  | 'exact-functional'
  | 'functional-expansion'
  | 'oracle-mechanic'
  | 'structural'
  | 'fallback';

export interface QueryPlan {
  id: string;
  strategy: QueryPlanStrategy;
  query: string;
  signal: string;
  confidence: number;
  weight: number;
  priceCeiling?: number;
}

const PRIMARY_TYPES = new Set([
  'artifact',
  'creature',
  'enchantment',
  'instant',
  'land',
  'planeswalker',
  'sorcery',
  'battle',
  'kindred',
]);

/** Colour-identity clause, or null for colourless cards. */
/** Base type clause(s) from the primary type line. */
function baseTypeClauses(card: SimilarityRequest): string[] {
  const primaryTypes = card.typeLine
    .replace(/Legendary\s*/i, '')
    .replace(/—.*/i, '')
    .trim()
    .split(/\s+/)
    .map((part) => part.toLowerCase())
    .filter((part) => PRIMARY_TYPES.has(part));
  return [...new Set(primaryTypes)].map((type) => `t:${type}`);
}

/** Price ceiling for budget alternatives. */
export function budgetCeiling(card: SimilarityRequest): number {
  if (
    typeof card.explicitMaxPrice === 'number' &&
    Number.isFinite(card.explicitMaxPrice) &&
    card.explicitMaxPrice > 0
  ) {
    return Math.round(card.explicitMaxPrice * 100) / 100;
  }
  const cardPrice = Number(card.prices?.usd);
  if (!Number.isFinite(cardPrice) || cardPrice < 2) return 0;
  return (
    Math.round(Math.max(0.5, Math.min(cardPrice - 1, cardPrice * 0.7)) * 100) /
    100
  );
}

function orderByPopularity(parts: string[]): string {
  return [...parts, 'order:edhrec', 'dir:asc'].join(' ');
}

function excludeSelf(card: SimilarityRequest): string {
  return `-!"${card.cardName.replace(/["()]/g, '').trim()}"`;
}

function mechanicClause(mechanic: string): string {
  if (mechanic === 'ETB') return 'o:"enters the battlefield"';
  if (mechanic === 'death trigger') return '(o:"when" o:"dies")';
  if (mechanic === 'tutor') return 'o:"search your library"';
  if (mechanic === 'mana production') return '(o:"add" o:"{")';
  return `o:"${mechanic.replace(/"/g, '')}"`;
}

/**
 * Produces a bounded, complementary retrieval plan. Source colour identity is
 * deliberately omitted: it is a soft ranking feature unless the user asked
 * for a colour or legality constraint explicitly.
 */
export function buildQueryPlans(
  card: SimilarityRequest,
  functionalTags: string[],
  mechanics: string[],
  functionalConfidence: number,
): { plans: QueryPlan[]; recoveryPlan: QueryPlan } {
  const plans: QueryPlan[] = [];
  const self = excludeSelf(card);
  const ceiling = budgetCeiling(card) || undefined;
  const specificTags = functionalTags.slice(0, 2);

  if (specificTags.length > 1) {
    plans.push({
      id: 'functional-combined',
      strategy: 'exact-functional',
      query: orderByPopularity([
        ...specificTags.map((tag) => `otag:${tag}`),
        self,
        'game:paper',
      ]),
      signal: specificTags.join('+'),
      confidence: functionalConfidence,
      weight: 1,
      priceCeiling: ceiling,
    });
  }

  for (const [index, tag] of specificTags.entries()) {
    if (plans.length >= 3) break;
    plans.push({
      id: `functional-${index + 1}`,
      strategy: 'functional-expansion',
      query: orderByPopularity([`otag:${tag}`, self, 'game:paper']),
      signal: tag,
      confidence: functionalConfidence,
      weight: 0.85,
      priceCeiling: ceiling,
    });
  }

  if (plans.length < 3 && mechanics.length > 0) {
    const clauses = mechanics.slice(0, 3).map(mechanicClause);
    plans.push({
      id: 'oracle-mechanic',
      strategy: 'oracle-mechanic',
      query: orderByPopularity([
        clauses.length > 1 ? `(${clauses.join(' OR ')})` : clauses[0],
        self,
        'game:paper',
      ]),
      signal: mechanics.slice(0, 3).join('+'),
      confidence: mechanics.length > 1 ? 0.75 : 0.6,
      weight: 0.7,
      priceCeiling: ceiling,
    });
  }

  const types = baseTypeClauses(card);
  const structuralTypes =
    types.length > 1 ? `(${types.join(' OR ')})` : types[0];
  const structuralParts = [structuralTypes, self, 'game:paper'].filter(
    (value): value is string => Boolean(value),
  );
  if (card.cmc !== undefined) {
    structuralParts.splice(
      structuralParts.length - 2,
      0,
      `mv>=${Math.max(0, card.cmc - 2)}`,
      `mv<=${card.cmc + 2}`,
    );
  }
  plans.push({
    id: 'structural',
    strategy: 'structural',
    query: orderByPopularity(structuralParts),
    signal: types.join('+') || 'paper-card',
    confidence: 0.5,
    weight: 0.4,
    priceCeiling: ceiling,
  });

  return {
    plans: plans.slice(0, 4),
    recoveryPlan: {
      id: 'broad-recovery',
      strategy: 'fallback',
      query: orderByPopularity([self, 'game:paper']),
      signal: 'broad-recovery',
      confidence: 0.3,
      weight: 0.25,
      priceCeiling: ceiling,
    },
  };
}

export function buildSimilarQuery(
  card: SimilarityRequest,
  mechanics: string[],
): string {
  const parts: string[] = [];

  const baseTypes = baseTypeClauses(card);
  if (baseTypes.length > 0) parts.push(...baseTypes);

  if (card.cmc !== undefined) {
    const lo = Math.max(0, card.cmc - 1);
    const hi = card.cmc + 1;
    parts.push(`mv>=${lo}`, `mv<=${hi}`);
  }

  parts.push(`-!"${card.cardName}"`);

  const kwParts: string[] = [];
  for (const kw of (card.keywords || []).slice(0, 2)) {
    const normalized = kw.toLowerCase().replace(/\s+/g, '-');
    kwParts.push(`kw:${normalized}`);
  }

  for (const mech of mechanics.slice(0, 2)) {
    if (mech === 'ETB') {
      parts.push('o:"enters the battlefield"');
    } else if (mech === 'death trigger') {
      parts.push('o:"when" o:"dies"');
    } else if (mech === 'tutor') {
      parts.push('o:"search your library"');
    } else if (mech === 'mana production') {
      parts.push('o:"add" o:"{"');
    } else {
      parts.push(`o:"${mech}"`);
    }
  }

  if (mechanics.length === 0 && kwParts.length > 0) {
    parts.push(...kwParts);
  }

  parts.push('order:name', 'dir:asc');
  return parts.join(' ');
}

export function buildBudgetQuery(
  card: SimilarityRequest,
  mechanics: string[],
): string {
  const parts: string[] = [];

  const baseTypes = baseTypeClauses(card);
  if (baseTypes.length > 0) parts.push(...baseTypes);

  if (mechanics.length > 0) {
    const mech = mechanics[0];
    if (mech === 'mana production') {
      parts.push('o:"add" o:"{"');
    } else if (mech === 'ETB') {
      parts.push('o:"enters the battlefield"');
    } else if (mech === 'tutor') {
      parts.push('o:"search your library"');
    } else {
      parts.push(`o:"${mech}"`);
    }
  }

  parts.push(`-!"${card.cardName}"`);
  const ceiling = budgetCeiling(card);
  if (ceiling > 0) parts.push(`usd<=${ceiling}`);
  parts.push('order:usd', 'dir:asc');

  return parts.join(' ');
}
