/**
 * Hook to fetch the most-played non-land card per deck name for thumbnail display.
 * Uses the get_signature_cards DB function.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SignatureCard {
  deckName: string;
  cardName: string;
  imageUrl: string;
}

export function useSignatureCards(format: string | null) {
  return useQuery({
    queryKey: ['signature-cards', format],
    queryFn: async (): Promise<Map<string, SignatureCard>> => {
      const { data, error } = await supabase.rpc('get_signature_cards', {
        target_format: format ?? undefined,
      });

      if (error) throw error;

      const map = new Map<string, SignatureCard>();
      for (const row of (data ?? []) as Array<{ deck_name: string; card_name: string; image_url: string }>) {
        map.set(row.deck_name, {
          deckName: row.deck_name,
          cardName: row.card_name,
          imageUrl: row.image_url,
        });
      }
      return map;
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!format,
  });
}
