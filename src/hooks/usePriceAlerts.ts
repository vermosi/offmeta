/**
 * Hooks for managing price alerts (CRUD).
 * @module hooks/usePriceAlerts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PriceAlert {
  id: string;
  user_id: string;
  card_name: string;
  scryfall_id: string | null;
  target_price: number;
  direction: 'below' | 'above';
  is_active: boolean;
  created_at: string;
  triggered_at: string | null;
}

const ALERTS_KEY = 'price-alerts';

export function usePriceAlerts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [ALERTS_KEY, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_alerts')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PriceAlert[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCardPriceAlerts(cardName: string | undefined) {
  const { data: alerts } = usePriceAlerts();
  if (!alerts || !cardName) return [];
  return alerts.filter((a) => a.card_name === cardName && a.is_active);
}

export function useCreatePriceAlert() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cardName,
      targetPrice,
      direction = 'below',
      scryfallId,
    }: {
      cardName: string;
      targetPrice: number;
      direction?: 'below' | 'above';
      scryfallId?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('price_alerts')
        .insert({
          user_id: user!.id,
          card_name: cardName.trim().slice(0, 200),
          scryfall_id: scryfallId ?? null,
          target_price: targetPrice,
          direction,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ALERTS_KEY] });
    },
  });
}

export function useDeletePriceAlert() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('price_alerts')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ALERTS_KEY] });
    },
  });
}
