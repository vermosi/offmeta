/**
 * Hook for deck idea generation.
 * @module hooks/useDeckIdeas
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/core/logger';

export interface DeckIdea {
  archetype: string;
  strategy: string;
  keyCards: string[];
  synergyPieces: string[];
  budgetOptions: string[];
}

const DECK_KEYWORDS = /\b(deck|build|commander|strategy|brew|edh)\b/i;

export function useDeckIdeas(query: string) {
  const [enabled, setEnabled] = useState(false);

  const isDeckQuery = DECK_KEYWORDS.test(query);

  const {
    data: deckIdea,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['deck-ideas', query],
    queryFn: async (): Promise<DeckIdea | null> => {
      const { data, error: fnError } = await supabase.functions.invoke(
        'deck-ideas',
        { body: { query: query.trim().slice(0, 500) } },
      );

      if (fnError || !data?.success) {
        logger.warn('Deck idea generation failed', fnError || data?.error);
        return null;
      }

      return {
        archetype: data.archetype || '',
        strategy: data.strategy || '',
        keyCards: data.keyCards || [],
        synergyPieces: data.synergyPieces || [],
        budgetOptions: data.budgetOptions || [],
      };
    },
    enabled: enabled && isDeckQuery && !!query.trim(),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });

  const activate = useCallback(() => {
    setEnabled(true);
  }, []);

  return {
    deckIdea,
    isLoading,
    error,
    isDeckQuery,
    activate,
  };
}
