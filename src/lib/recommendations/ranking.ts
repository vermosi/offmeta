import type { ScryfallCard } from '@/types/card';
import type {
  CandidateProvenance,
  QueryPlan,
  RankingScoreBreakdown,
  RecommendationIntent,
} from '@/types/recommendations';
import { RECOMMENDATION_VERSION } from '@/types/recommendations';

const PRIMARY_TYPES = new Set([
  'artifact',
  'battle',
  'creature',
  'enchantment',
  'instant',
  'kindred',
  'land',
  'planeswalker',
  'sorcery',
]);

const MECHANIC_PATTERNS: ReadonlyArray<[string, RegExp]> = [
  ['treasure', /\btreasures?\b/i],
  ['draw', /\bdraws?\b/i],
  ['destroy', /\bdestroy\b/i],
  ['exile', /\bexile\b/i],
  ['counter', /\bcounter target\b/i],
  ['tutor', /\bsearch your library\b/i],
  ['recursion', /\bfrom (?:your|a) graveyard\b/i],
  ['tokens', /\bcreate\b[^.]{0,80}\btokens?\b/i],
  ['mana', /\badd\s+\{/i],
  ['mill', /\bmills?\b/i],
  ['discard', /\bdiscards?\b/i],
  ['sacrifice', /\bsacrifices?\b/i],
  ['bounce', /\breturn target\b[^.]{0,80}\bhand\b/i],
  ['untap', /\buntap\b/i],
  ['extra-turn', /\bextra turn\b/i],
  ['protection', /\b(?:hexproof|indestructible|protection from)\b/i],
];

export interface RankedRecommendation {
  card: ScryfallCard;
  provenance: CandidateProvenance[];
  breakdown: RankingScoreBreakdown;
}

export interface CandidateWithProvenance {
  card: ScryfallCard;
  provenance: CandidateProvenance[];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function fullOracleText(card: ScryfallCard): string {
  return [
    card.oracle_text,
    ...(card.card_faces?.map((face) => face.oracle_text) ?? []),
  ]
    .filter((text): text is string => Boolean(text))
    .join('\n')
    .toLowerCase();
}

function primaryTypes(card: ScryfallCard): Set<string> {
  const values = [
    card.type_line,
    ...(card.card_faces?.map((face) => face.type_line) ?? []),
  ]
    .join(' ')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((value) => PRIMARY_TYPES.has(value));
  return new Set(values);
}

function mechanicFeatures(card: ScryfallCard): Set<string> {
  const oracle = fullOracleText(card);
  return new Set(
    MECHANIC_PATTERNS.filter(([, pattern]) => pattern.test(oracle)).map(
      ([name]) => name,
    ),
  );
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 && right.size === 0) return 1;
  const union = new Set([...left, ...right]);
  let intersection = 0;
  for (const value of left) {
    if (right.has(value)) intersection += 1;
  }
  return union.size === 0 ? 0 : intersection / union.size;
}

export function logPopularity(card: ScryfallCard): number {
  const rank = card.edhrec_rank;
  if (typeof rank !== 'number' || rank <= 0) return 0;
  return clamp(1 - Math.log1p(Math.min(rank, 50000)) / Math.log1p(50000));
}

export function provenancePrior(
  provenance: CandidateProvenance[],
  plans: QueryPlan[],
): number {
  if (provenance.length === 0 || plans.length === 0) return 0;
  const raw = provenance.reduce(
    (sum, item) => sum + item.planWeight / (60 + item.sourceRank),
    0,
  );
  const maximum = plans.reduce((sum, plan) => sum + plan.weight / 61, 0);
  return maximum > 0 ? clamp(raw / maximum) : 0;
}

function functionalProvenance(
  provenance: CandidateProvenance[],
  plans: QueryPlan[],
): number {
  const functionalStrategies = new Set([
    'exact-functional',
    'functional-expansion',
    'oracle-mechanic',
  ]);
  const raw = provenance
    .filter((item) => functionalStrategies.has(item.strategy))
    .reduce((sum, item) => sum + item.planWeight / (60 + item.sourceRank), 0);
  const maximum = plans
    .filter((plan) => functionalStrategies.has(plan.strategy))
    .reduce((sum, plan) => sum + plan.weight / 61, 0);
  return maximum > 0 ? clamp(raw / maximum) : 0;
}

function planAgreement(
  provenance: CandidateProvenance[],
  plans: QueryPlan[],
): number {
  const supported = new Set(provenance.map((item) => item.planId));
  const totalWeight = plans.reduce((sum, plan) => sum + plan.weight, 0);
  const supportedWeight = plans.reduce(
    (sum, plan) => sum + (supported.has(plan.id) ? plan.weight : 0),
    0,
  );
  return totalWeight > 0 ? clamp(supportedWeight / totalWeight) : 0;
}

function structuralCoverage(
  source: ScryfallCard,
  candidate: ScryfallCard,
): number {
  const typeScore = jaccard(primaryTypes(source), primaryTypes(candidate));
  const colorScore = jaccard(
    new Set(source.color_identity ?? []),
    new Set(candidate.color_identity ?? []),
  );
  const manaScore = Math.exp(-Math.abs(source.cmc - candidate.cmc) / 2);
  return clamp(0.5 * typeScore + 0.25 * colorScore + 0.25 * manaScore);
}

function satisfiesConstraints(
  card: ScryfallCard,
  intent: RecommendationIntent,
): boolean {
  const constraints = intent.hardConstraints;
  if (constraints.maxPrice !== undefined) {
    const price = Number(card.prices.usd);
    if (!Number.isFinite(price) || price > constraints.maxPrice) return false;
  }
  if (constraints.format) {
    if (card.legalities[constraints.format.toLowerCase()] !== 'legal')
      return false;
  }
  if (constraints.colors?.length) {
    const actual = new Set(card.color_identity ?? []);
    const wanted = new Set(constraints.colors);
    const includesAll = [...wanted].every((color) => actual.has(color));
    if (!includesAll) return false;
    if (constraints.exactColorIdentity && actual.size !== wanted.size)
      return false;
  }
  if (constraints.types?.length) {
    const types = primaryTypes(card);
    if (!constraints.types.every((type) => types.has(type.toLowerCase()))) {
      return false;
    }
  }
  if (
    constraints.minManaValue !== undefined &&
    card.cmc < constraints.minManaValue
  ) {
    return false;
  }
  if (
    constraints.maxManaValue !== undefined &&
    card.cmc > constraints.maxManaValue
  ) {
    return false;
  }
  return !intent.exclusions.some(
    (name) => name.toLowerCase() === card.name.toLowerCase(),
  );
}

export function automaticBudgetCeiling(source: ScryfallCard): number | null {
  const price = Number(source.prices.usd);
  if (!Number.isFinite(price) || price < 2) return null;
  return (
    Math.round(Math.max(0.5, Math.min(price - 1, price * 0.7)) * 100) / 100
  );
}

export function rankSimilarityCandidates(
  source: ScryfallCard,
  candidates: CandidateWithProvenance[],
  plans: QueryPlan[],
  intent: RecommendationIntent,
): { similar: RankedRecommendation[]; budget: RankedRecommendation[] } {
  const sourceMechanics = mechanicFeatures(source);
  const ceiling =
    intent.hardConstraints.maxPrice ?? automaticBudgetCeiling(source);
  const eligible = candidates.filter(({ card }) =>
    satisfiesConstraints(card, {
      ...intent,
      hardConstraints: {
        ...intent.hardConstraints,
        maxPrice: undefined,
      },
    }),
  );

  const scored = eligible.map(({ card, provenance }) => {
    const functional = functionalProvenance(provenance, plans);
    const oracleCoverage = jaccard(sourceMechanics, mechanicFeatures(card));
    const typeScore = jaccard(primaryTypes(source), primaryTypes(card));
    const colorScore = jaccard(
      new Set(source.color_identity ?? []),
      new Set(card.color_identity ?? []),
    );
    const manaScore = Math.exp(-Math.abs(source.cmc - card.cmc) / 2);
    const popularity = logPopularity(card);
    const provenanceScore = provenancePrior(provenance, plans);
    const similarity = clamp(
      0.5 * functional +
        0.2 * oracleCoverage +
        0.1 * typeScore +
        0.05 * colorScore +
        0.05 * manaScore +
        0.1 * popularity,
    );
    return {
      card,
      provenance,
      similarity,
      semanticCoverage: clamp(0.7 * functional + 0.3 * oracleCoverage),
      structuralCoverage: structuralCoverage(source, card),
      popularity,
      provenanceScore,
      agreement: planAgreement(provenance, plans),
    };
  });

  scored.sort(
    (left, right) =>
      right.similarity - left.similarity ||
      right.semanticCoverage - left.semanticCoverage ||
      right.structuralCoverage - left.structuralCoverage ||
      right.provenanceScore - left.provenanceScore ||
      left.card.name.localeCompare(right.card.name),
  );

  const similar = scored.map((entry, index): RankedRecommendation => {
    const nextScore = scored[index + 1]?.similarity ?? 0;
    const separation = clamp((entry.similarity - nextScore) / 0.15);
    const confidence = clamp(
      0.35 * entry.agreement +
        0.3 * entry.semanticCoverage +
        0.2 * separation +
        0.15 * intent.confidence,
    );
    return {
      card: entry.card,
      provenance: entry.provenance,
      breakdown: {
        semanticCoverage: entry.semanticCoverage,
        structuralCoverage: entry.structuralCoverage,
        popularity: entry.popularity,
        provenancePrior: entry.provenanceScore,
        finalScore: entry.similarity,
        confidence,
        rankerVersion: RECOMMENDATION_VERSION,
      },
    };
  });

  const budget = similar
    .filter(({ card }) => {
      if (ceiling === null) return false;
      const price = Number(card.prices.usd);
      return Number.isFinite(price) && price <= ceiling;
    })
    .map((entry) => {
      const price = Number(entry.card.prices.usd);
      const affordability = ceiling ? clamp(1 - price / ceiling) : 0;
      return {
        ...entry,
        breakdown: {
          ...entry.breakdown,
          affordability,
          finalScore: 0.8 * entry.breakdown.finalScore + 0.2 * affordability,
        },
      };
    })
    .sort(
      (left, right) =>
        right.breakdown.finalScore - left.breakdown.finalScore ||
        right.breakdown.semanticCoverage - left.breakdown.semanticCoverage ||
        left.card.name.localeCompare(right.card.name),
    );

  return { similar, budget };
}
