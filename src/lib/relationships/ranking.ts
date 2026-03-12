/**
 * Ranking utilities for card relationships.
 * Sorts and filters relationships for display.
 * @module lib/relationships/ranking
 */

import type { RelationshipType } from './scoring';

export interface RankedRelationship {
  oracleId: string;
  cardName: string;
  weight: number;
  cooccurrenceCount: number;
  relationshipType: RelationshipType;
  manaCost: string | null;
  typeLine: string | null;
  imageUrl: string | null;
}

/**
 * Ranks relationships by weight (desc), then by co-occurrence count (desc).
 * Returns a new sorted array — does not mutate input.
 */
export function rankRelationships(
  relationships: RankedRelationship[],
  limit?: number,
): RankedRelationship[] {
  const sorted = [...relationships].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return b.cooccurrenceCount - a.cooccurrenceCount;
  });

  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Filters relationships by type.
 */
export function filterByType(
  relationships: RankedRelationship[],
  type: RelationshipType,
): RankedRelationship[] {
  return relationships.filter((r) => r.relationshipType === type);
}

/**
 * Returns a human-readable label for a relationship type.
 */
export function getRelationshipLabel(type: RelationshipType): string {
  const labels: Record<RelationshipType, string> = {
    co_played: 'Commonly played with',
    similar_role: 'Similar role',
    budget_alternative: 'Budget alternative',
    archetype_core: 'Core in archetype',
    user_behavior_related: 'Players also viewed',
  };
  return labels[type] ?? type;
}
