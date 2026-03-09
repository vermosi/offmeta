/**
 * Hook for fetching market trend data (biggest price movers).
 * Falls back to deterministic demo data when real snapshots are sparse.
 * @module hooks/useMarketTrends
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PriceMover {
  card_name: string;
  scryfall_id: string | null;
  current_price: number;
  previous_price: number;
  change_percent: number;
  direction: 'up' | 'down' | 'stable';
  rarity: string | null;
  type_line: string | null;
  colors: string[] | null;
  legalities: Record<string, string> | null;
}

const DEMO_GAINERS: PriceMover[] = [
  { card_name: 'Dockside Extortionist', scryfall_id: null, current_price: 42.5, previous_price: 35.0, change_percent: 21.4, direction: 'up', rarity: 'rare', type_line: 'Creature — Goblin Pirate', colors: ['R'], legalities: { commander: 'banned', legacy: 'legal', vintage: 'legal' } },
  { card_name: 'The One Ring', scryfall_id: null, current_price: 68.0, previous_price: 58.0, change_percent: 17.2, direction: 'up', rarity: 'mythic', type_line: 'Legendary Artifact', colors: [], legalities: { commander: 'legal', modern: 'legal', legacy: 'legal' } },
  { card_name: 'Smothering Tithe', scryfall_id: null, current_price: 28.5, previous_price: 25.0, change_percent: 14.0, direction: 'up', rarity: 'rare', type_line: 'Enchantment', colors: ['W'], legalities: { commander: 'legal', pioneer: 'legal' } },
  { card_name: 'Ragavan, Nimble Pilferer', scryfall_id: null, current_price: 55.0, previous_price: 49.0, change_percent: 12.2, direction: 'up', rarity: 'mythic', type_line: 'Legendary Creature — Monkey Pirate', colors: ['R'], legalities: { modern: 'legal', legacy: 'legal' } },
  { card_name: 'Jeweled Lotus', scryfall_id: null, current_price: 95.0, previous_price: 86.0, change_percent: 10.5, direction: 'up', rarity: 'mythic', type_line: 'Artifact', colors: [], legalities: { commander: 'banned', legacy: 'legal', vintage: 'restricted' } },
  { card_name: 'Mana Crypt', scryfall_id: null, current_price: 155.0, previous_price: 142.0, change_percent: 9.2, direction: 'up', rarity: 'mythic', type_line: 'Artifact', colors: [], legalities: { commander: 'banned', legacy: 'banned', vintage: 'restricted' } },
  { card_name: 'Fierce Guardianship', scryfall_id: null, current_price: 32.0, previous_price: 29.5, change_percent: 8.5, direction: 'up', rarity: 'rare', type_line: 'Instant', colors: ['U'], legalities: { commander: 'legal', legacy: 'legal' } },
  { card_name: 'Cyclonic Rift', scryfall_id: null, current_price: 24.0, previous_price: 22.5, change_percent: 6.7, direction: 'up', rarity: 'rare', type_line: 'Instant', colors: ['U'], legalities: { commander: 'legal', modern: 'legal', pioneer: 'legal' } },
  { card_name: "Teferi's Protection", scryfall_id: null, current_price: 30.0, previous_price: 28.5, change_percent: 5.3, direction: 'up', rarity: 'rare', type_line: 'Instant', colors: ['W'], legalities: { commander: 'legal', legacy: 'legal' } },
  { card_name: 'Esper Sentinel', scryfall_id: null, current_price: 18.0, previous_price: 17.2, change_percent: 4.7, direction: 'up', rarity: 'rare', type_line: 'Artifact Creature — Human Soldier', colors: ['W'], legalities: { commander: 'legal', modern: 'legal' } },
];

const DEMO_LOSERS: PriceMover[] = [
  { card_name: 'Sheoldred, the Apocalypse', scryfall_id: null, current_price: 52.0, previous_price: 70.0, change_percent: -25.7, direction: 'down', rarity: 'mythic', type_line: 'Legendary Creature — Phyrexian Praetor', colors: ['B'], legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' } },
  { card_name: 'Wrenn and Six', scryfall_id: null, current_price: 38.0, previous_price: 48.0, change_percent: -20.8, direction: 'down', rarity: 'mythic', type_line: 'Legendary Planeswalker — Wrenn', colors: ['R', 'G'], legalities: { modern: 'legal', legacy: 'legal' } },
  { card_name: 'Atraxa, Grand Unifier', scryfall_id: null, current_price: 15.0, previous_price: 18.5, change_percent: -18.9, direction: 'down', rarity: 'mythic', type_line: 'Legendary Creature — Phyrexian Angel', colors: ['W', 'U', 'B', 'G'], legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' } },
  { card_name: 'Fable of the Mirror-Breaker', scryfall_id: null, current_price: 12.0, previous_price: 14.5, change_percent: -17.2, direction: 'down', rarity: 'rare', type_line: 'Enchantment — Saga', colors: ['R'], legalities: { pioneer: 'legal', modern: 'legal' } },
  { card_name: 'Ledger Shredder', scryfall_id: null, current_price: 8.5, previous_price: 10.0, change_percent: -15.0, direction: 'down', rarity: 'rare', type_line: 'Creature — Bird Advisor', colors: ['U'], legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' } },
  { card_name: 'Omnath, Locus of Creation', scryfall_id: null, current_price: 6.0, previous_price: 7.0, change_percent: -14.3, direction: 'down', rarity: 'mythic', type_line: 'Legendary Creature — Elemental', colors: ['W', 'U', 'R', 'G'], legalities: { modern: 'legal', legacy: 'legal' } },
  { card_name: 'Seasoned Dungeoneer', scryfall_id: null, current_price: 4.5, previous_price: 5.2, change_percent: -13.5, direction: 'down', rarity: 'rare', type_line: 'Creature — Human Warrior', colors: ['W'], legalities: { commander: 'legal', legacy: 'legal' } },
  { card_name: 'Bloodtithe Harvester', scryfall_id: null, current_price: 1.8, previous_price: 2.0, change_percent: -10.0, direction: 'down', rarity: 'uncommon', type_line: 'Creature — Vampire', colors: ['B', 'R'], legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' } },
  { card_name: 'Raffine, Scheming Seer', scryfall_id: null, current_price: 3.5, previous_price: 3.8, change_percent: -7.9, direction: 'down', rarity: 'mythic', type_line: 'Legendary Creature — Sphinx Demon', colors: ['W', 'U', 'B'], legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' } },
  { card_name: 'Invoke Despair', scryfall_id: null, current_price: 2.0, previous_price: 2.15, change_percent: -7.0, direction: 'down', rarity: 'rare', type_line: 'Sorcery', colors: ['B'], legalities: { pioneer: 'banned', modern: 'legal' } },
];

export function useMarketTrends(daysBack: number = 7) {
  const query = useQuery({
    queryKey: ['market-trends', daysBack],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_price_movers', {
        days_back: daysBack,
        limit_count: 50,
      });

      if (error) throw error;
      return (data ?? []) as PriceMover[];
    },
    staleTime: 30 * 60 * 1000,
  });

  const hasRealData = (query.data?.length ?? 0) >= 4;

  const allMovers = hasRealData ? query.data! : [];
  const gainers = hasRealData
    ? allMovers.filter((m) => m.direction === 'up').sort((a, b) => b.change_percent - a.change_percent)
    : DEMO_GAINERS;
  const losers = hasRealData
    ? allMovers.filter((m) => m.direction === 'down').sort((a, b) => a.change_percent - b.change_percent)
    : DEMO_LOSERS;

  return {
    gainers,
    losers,
    allMovers: hasRealData ? allMovers : [...DEMO_GAINERS, ...DEMO_LOSERS],
    isLoading: query.isLoading,
    isDemo: !hasRealData,
  };
}
