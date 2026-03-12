/**
 * Co-play scoring and relationship weight computation.
 * Uses PMI-style normalization to prevent popular cards from dominating.
 * @module lib/relationships/scoring
 */

/**
 * Computes normalized co-play score using PMI-style formula.
 * Score = decks_containing_both / sqrt(cardA_deck_count * cardB_deck_count)
 *
 * This penalizes universally-played staples (Sol Ring, Command Tower)
 * and rewards meaningful pairwise synergies.
 *
 * @returns Score between 0 and 1 (capped). Returns 0 if inputs are invalid.
 */
export function computeCoPlayScore(
  decksBoth: number,
  deckCountA: number,
  deckCountB: number,
): number {
  if (decksBoth <= 0 || deckCountA <= 0 || deckCountB <= 0) return 0;
  if (decksBoth > deckCountA || decksBoth > deckCountB) return 0;

  const denominator = Math.sqrt(deckCountA * deckCountB);
  if (denominator === 0) return 0;

  const score = decksBoth / denominator;
  return Math.min(score, 1);
}

/**
 * Normalizes a relationship weight to a 0–1 range given a max observed weight.
 */
export function normalizeRelationshipWeight(
  weight: number,
  maxWeight: number,
): number {
  if (maxWeight <= 0 || weight <= 0) return 0;
  return Math.min(weight / maxWeight, 1);
}

/** Known relationship types for the discovery engine. */
export const RELATIONSHIP_TYPES = [
  'co_played',
  'similar_role',
  'budget_alternative',
  'archetype_core',
  'user_behavior_related',
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];
