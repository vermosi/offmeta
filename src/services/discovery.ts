/**
 * Discovery service layer.
 * Provides card relationship queries and enrichment.
 * All database access for the discovery engine goes through here.
 * @module services/discovery
 */

import { supabase } from '@/integrations/supabase/client';
import { rankRelationships, filterByType } from '@/lib/relationships/ranking';
import type { RankedRelationship } from '@/lib/relationships/ranking';
import type { RelationshipType } from '@/lib/relationships/scoring';

interface RecommendationRow {
  oracle_id: string;
  card_name: string;
  cooccurrence_count: number;
  weight: number;
  relationship_type: string;
  mana_cost: string | null;
  type_line: string | null;
  image_url: string | null;
}

function mapRow(row: RecommendationRow): RankedRelationship {
  return {
    oracleId: row.oracle_id,
    cardName: row.card_name,
    weight: Number(row.weight) || 0,
    cooccurrenceCount: row.cooccurrence_count,
    relationshipType: (row.relationship_type ?? 'co_played') as RelationshipType,
    manaCost: row.mana_cost,
    typeLine: row.type_line,
    imageUrl: row.image_url,
  };
}

/**
 * Fetches related cards for a given oracle ID.
 * Optionally filters by relationship type.
 */
export async function getRelatedCards(
  oracleId: string,
  options?: {
    relationshipType?: RelationshipType;
    format?: string;
    limit?: number;
  },
): Promise<RankedRelationship[]> {
  const limit = options?.limit ?? 20;
  const format = options?.format ?? 'all';

  // Race against a 3-second timeout to prevent indefinite loading
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));

  const request = supabase.functions
    .invoke('card-recommendations', {
      body: { oracle_id: oracleId, format, limit },
    })
    .catch(() => null);

  const result = await Promise.race([request, timeout]);

  // Timeout, error, or no data
  if (!result) return [];
  if ('error' in result && result.error) return [];
  if (!('data' in result) || !result.data?.recommendations) return [];

  let results = (result.data.recommendations as RecommendationRow[]).map(mapRow);

  if (options?.relationshipType) {
    results = filterByType(results, options.relationshipType);
  }

  return rankRelationships(results, limit);
}

/**
 * Fetches top relationships for a card across all types.
 */
export async function getTopRelationships(
  oracleId: string,
  limit = 10,
): Promise<RankedRelationship[]> {
  return getRelatedCards(oracleId, { limit });
}

/**
 * Fetches related cards for multiple card IDs (e.g. from search results).
 * Deduplicates and merges results.
 */
export async function getRelatedCardsForSearchResults(
  oracleIds: string[],
  limit = 8,
): Promise<RankedRelationship[]> {
  if (oracleIds.length === 0) return [];

  // Only query top 3 cards to limit cost
  const topIds = oracleIds.slice(0, 3);
  const allResults = await Promise.allSettled(
    topIds.map((id) => getRelatedCards(id, { limit: 6 })),
  );

  const seen = new Set<string>();
  const merged: RankedRelationship[] = [];

  // Also exclude the source cards themselves
  const sourceSet = new Set(oracleIds);

  for (const result of allResults) {
    if (result.status !== 'fulfilled') continue;
    for (const rel of result.value) {
      if (seen.has(rel.oracleId) || sourceSet.has(rel.oracleId)) continue;
      seen.add(rel.oracleId);
      merged.push(rel);
    }
  }

  return rankRelationships(merged, limit);
}
