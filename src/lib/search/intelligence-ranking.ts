import type { ScryfallCard } from '@/types/card';
import type { SearchIntent } from '@/types/search';

export interface RankingContext {
  queryQualityScore: number;
  queryConfidence: number;
  querySampleSize: number;
  ownedCards: Map<string, number>;
  hadFastClick: boolean;
  hadRefinement: boolean;
  isAuthenticated: boolean;
  intent?: SearchIntent | null;
}

interface ScoredCard {
  card: ScryfallCard;
  semanticCoverage: number;
  structuralCoverage: number;
  popularity: number;
  provenancePrior: number;
  score: number;
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

function popularityScore(card: ScryfallCard): number {
  const rank = card.edhrec_rank;
  if (typeof rank !== 'number' || rank <= 0) return 0;
  return clamp(1 - Math.log1p(Math.min(rank, 50000)) / Math.log1p(50000));
}

function semanticCoverage(
  card: ScryfallCard,
  intent: SearchIntent | null | undefined,
): number {
  if (!intent || intent.oraclePatterns.length === 0) return 0;
  const oracle = fullOracleText(card);
  let matched = 0;
  for (const pattern of intent.oraclePatterns) {
    const normalized = pattern
      .replace(/^o:/i, '')
      .replace(/^"|"$/g, '')
      .trim()
      .toLowerCase();
    if (normalized && oracle.includes(normalized)) matched += 1;
  }
  return matched / intent.oraclePatterns.length;
}

function numericConstraintMatches(
  actual: number,
  constraint: { op: string; value: number },
): boolean {
  switch (constraint.op) {
    case '<':
      return actual < constraint.value;
    case '<=':
      return actual <= constraint.value;
    case '>':
      return actual > constraint.value;
    case '>=':
      return actual >= constraint.value;
    case '=':
    case ':':
    case '==':
      return actual === constraint.value;
    default:
      return false;
  }
}

function colorConstraintMatches(
  card: ScryfallCard,
  intent: SearchIntent,
): boolean {
  if (!intent.colors || intent.colors.values.length === 0) return true;
  const actual = new Set(
    intent.colors.isIdentity ? card.color_identity : (card.colors ?? []),
  );
  const wanted = new Set(intent.colors.values);
  if (wanted.has('C')) return actual.size === 0;
  if (intent.colors.isOr) {
    return [...wanted].some((color) => actual.has(color));
  }
  const containsAll = [...wanted].every((color) => actual.has(color));
  return intent.colors.isExact
    ? containsAll && actual.size === wanted.size
    : containsAll;
}

function structuralCoverage(
  card: ScryfallCard,
  intent: SearchIntent | null | undefined,
): number {
  if (!intent) return 0;
  const matches: boolean[] = [];
  if (intent.colors?.values.length)
    matches.push(colorConstraintMatches(card, intent));
  if (intent.types.length > 0) {
    const typeLine = [
      card.type_line,
      ...(card.card_faces?.map((face) => face.type_line) ?? []),
    ]
      .join(' ')
      .toLowerCase();
    matches.push(
      intent.types.every((type) => typeLine.includes(type.toLowerCase())),
    );
  }
  if (intent.cmc) matches.push(numericConstraintMatches(card.cmc, intent.cmc));
  if (intent.power) {
    const power = Number(card.power);
    matches.push(
      Number.isFinite(power) && numericConstraintMatches(power, intent.power),
    );
  }
  if (intent.toughness) {
    const toughness = Number(card.toughness);
    matches.push(
      Number.isFinite(toughness) &&
        numericConstraintMatches(toughness, intent.toughness),
    );
  }
  if (matches.length === 0) return 0;
  return matches.filter(Boolean).length / matches.length;
}

function hasStructuralIntent(intent: SearchIntent | null | undefined): boolean {
  return Boolean(
    intent &&
    (intent.colors?.values.length ||
      intent.types.length ||
      intent.cmc ||
      intent.power ||
      intent.toughness),
  );
}

export function rerankCardsWithIntelligence(
  cards: ScryfallCard[],
  context: RankingContext,
): ScryfallCard[] {
  const denominator = Math.max(cards.length - 1, 1);
  const scored: ScoredCard[] = cards.map((card, index) => {
    const semantic = semanticCoverage(card, context.intent);
    const structural = structuralCoverage(card, context.intent);
    const popularity = popularityScore(card);
    const provenance = 1 - index / denominator;
    const constraintPenalty = hasStructuralIntent(context.intent)
      ? (semantic > 0 ? 0.15 : 0.3) * (1 - structural)
      : 0;
    return {
      card,
      semanticCoverage: semantic,
      structuralCoverage: structural,
      popularity,
      provenancePrior: provenance,
      score:
        0.55 * semantic +
        0.2 * structural +
        0.15 * popularity +
        0.1 * provenance -
        constraintPenalty,
    };
  });

  return scored
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.semanticCoverage - left.semanticCoverage ||
        right.structuralCoverage - left.structuralCoverage ||
        right.provenancePrior - left.provenancePrior ||
        left.card.name.localeCompare(right.card.name),
    )
    .map((entry) => entry.card);
}
