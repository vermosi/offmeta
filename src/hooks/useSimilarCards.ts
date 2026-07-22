/**
 * Hook for "Find Cards Like This" feature.
 * Detects card names, fetches similarity data, and manages tab state.
 * @module hooks/useSimilarCards
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCardByName, searchCards } from '@/lib/scryfall/client';
import type { ScryfallCard, SearchResult } from '@/types/card';
import { useAnalytics } from '@/hooks/useAnalytics';
import { logger } from '@/lib/core/logger';

export interface SynergyCard {
  name: string;
  reason: string;
  scryfallData?: ScryfallCard;
}

export interface SimilarityData {
  sourceCard: ScryfallCard;
  similarResults: SearchResult | null;
  budgetResults: SearchResult | null;
  synergyCards: SynergyCard[];
}

/**
 * Debounce interval before a query change triggers a new fetch.
 * Long enough to swallow rapid typing, short enough to feel instant
 * once the user stops.
 */
const SIMILAR_DEBOUNCE_MS = 350;

/**
 * Module-level LRU cache so repeated strategy-hate lookups (e.g. clicking
 * the Similar tab twice in one session, or two components mounting for the
 * same query) resolve synchronously instead of re-invoking the edge
 * function. Survives react-query's per-mount gcTime and cross-component
 * unmounts. Bounded to keep memory flat across long sessions.
 */
const SIMILAR_CACHE_MAX = 50;
const similarityCache = new Map<string, SimilarityData | null>();

function cacheKey(query: string, fallbackId: string | null): string {
  return `${query.trim().toLowerCase()}::${fallbackId ?? ''}`;
}

function readCache(key: string): SimilarityData | null | undefined {
  if (!similarityCache.has(key)) return undefined;
  // Refresh LRU position.
  const value = similarityCache.get(key);
  similarityCache.delete(key);
  similarityCache.set(key, value as SimilarityData | null);
  return value;
}

function writeCache(key: string, value: SimilarityData | null): void {
  if (similarityCache.has(key)) similarityCache.delete(key);
  similarityCache.set(key, value);
  while (similarityCache.size > SIMILAR_CACHE_MAX) {
    const oldest = similarityCache.keys().next().value;
    if (oldest === undefined) break;
    similarityCache.delete(oldest);
  }
}

/** Exposed for tests. */
export function __clearSimilarityCache(): void {
  similarityCache.clear();
}

/**
 * Attempts to detect if a search query is a specific card name
 * by doing an exact match lookup on Scryfall.
 */
async function detectCardName(query: string): Promise<ScryfallCard | null> {
  const trimmed = query.trim();
  // Heuristic: card names are typically 1-6 words, no operators
  if (!trimmed || trimmed.length > 100) return null;
  if (/[():!<>=]/.test(trimmed)) return null; // Contains Scryfall operators
  const words = trimmed.split(/\s+/);
  if (words.length > 7) return null;

  try {
    return await getCardByName(trimmed);
  } catch {
    return null;
  }
}

export function useSimilarCards(query: string, fallbackCard?: ScryfallCard | null) {
  const { trackEvent } = useAnalytics();
  const [enabled, setEnabled] = useState(false);

  // Debounce the query so rapid typing (or upstream state churn) doesn't
  // spawn a series of edge-function calls that all get thrown away.
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const trimmed = query.trim();
    // Empty query → apply immediately so the tab clears without delay.
    if (!trimmed) {
      setDebouncedQuery(query);
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(query), SIMILAR_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const fallbackId = fallbackCard?.id ?? null;
  const key = cacheKey(debouncedQuery, fallbackId);

  const {
    data: similarityData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['similar-cards', debouncedQuery, fallbackId],
    queryFn: async (): Promise<SimilarityData | null> => {
      const cached = readCache(key);
      if (cached !== undefined) return cached;

      const sourceCard =
        (await detectCardName(debouncedQuery)) ?? fallbackCard ?? null;
      if (!sourceCard) {
        writeCache(key, null);
        return null;
      }

      // Call edge function for similarity queries + AI synergy
      const { data, error: fnError } = await supabase.functions.invoke(
        'card-similarity',
        {
          body: {
            cardName: sourceCard.name,
            typeLine: sourceCard.type_line,
            oracleText: sourceCard.oracle_text,
            colorIdentity: sourceCard.color_identity,
            keywords: ((sourceCard as unknown) as { keywords?: string[] }).keywords ?? [],
            cmc: sourceCard.cmc,
            prices: sourceCard.prices,
          },
        },
      );

      if (fnError || !data?.success) {
        logger.warn('Card similarity fetch failed', fnError || data?.error);
        // Don't cache transient failures — allow a retry on next activation.
        return null;
      }

      // Fetch similar and budget results from Scryfall
      const [similarResults, budgetResults] = await Promise.allSettled([
        data.similarQuery ? searchCards(data.similarQuery, 1) : Promise.resolve(null),
        data.budgetQuery ? searchCards(data.budgetQuery, 1) : Promise.resolve(null),
      ]);

      const result: SimilarityData = {
        sourceCard,
        similarResults: similarResults.status === 'fulfilled' ? similarResults.value : null,
        budgetResults: budgetResults.status === 'fulfilled' ? budgetResults.value : null,
        synergyCards: data.synergyCards || [],
      };
      writeCache(key, result);
      return result;
    },
    enabled: enabled && (!!debouncedQuery.trim() || !!fallbackCard),
    staleTime: 10 * 60 * 1000, // 10 min
    gcTime: 30 * 60 * 1000,
    retry: false,
  });

  const activate = useCallback(() => {
    setEnabled(true);
    trackEvent('card_click', {
      card_id: 'similarity_tab',
      card_name: query,
      set_code: '',
      rarity: '',
    });
  }, [query, trackEvent]);

  return {
    similarityData,
    isLoading,
    error,
    activate,
    isDetected: similarityData?.sourceCard != null,
  };
}
