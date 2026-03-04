/**
 * Hook for "Find Cards Like This" feature.
 * Detects card names, fetches similarity data, and manages tab state.
 * @module hooks/useSimilarCards
 */

import { useState, useCallback } from 'react';
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

export function useSimilarCards(query: string) {
  const { trackEvent } = useAnalytics();
  const [enabled, setEnabled] = useState(false);

  const {
    data: similarityData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['similar-cards', query],
    queryFn: async (): Promise<SimilarityData | null> => {
      const sourceCard = await detectCardName(query);
      if (!sourceCard) return null;

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
        return null;
      }

      // Fetch similar and budget results from Scryfall
      const [similarResults, budgetResults] = await Promise.allSettled([
        data.similarQuery ? searchCards(data.similarQuery, 1) : Promise.resolve(null),
        data.budgetQuery ? searchCards(data.budgetQuery, 1) : Promise.resolve(null),
      ]);

      return {
        sourceCard,
        similarResults: similarResults.status === 'fulfilled' ? similarResults.value : null,
        budgetResults: budgetResults.status === 'fulfilled' ? budgetResults.value : null,
        synergyCards: data.synergyCards || [],
      };
    },
    enabled: enabled && !!query.trim(),
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
