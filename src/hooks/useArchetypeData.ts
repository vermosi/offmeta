/**
 * Hook to fetch pre-aggregated archetype stats from a materialized view.
 * Returns structured data for the data-driven archetypes UI.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ArchetypeEntry {
  archetype: string;
  format: string;
  deckCount: number;
  colors: string[][];
  primaryColors: string[];
}

export interface ArchetypesByFormat {
  format: string;
  label: string;
  archetypes: ArchetypeEntry[];
  totalDecks: number;
}

const FORMAT_LABELS: Record<string, string> = {
  commander: 'Commander',
  pauper: 'Pauper',
  legacy: 'Legacy',
  premodern: 'Premodern',
  other: 'Other',
};

const FORMAT_ORDER = ['commander', 'pauper', 'legacy', 'premodern', 'other'];

interface ArchetypeStatsRow {
  format: string;
  archetype: string;
  deck_count: number;
  primary_colors_str: string | null;
  all_colors: string[] | null;
}

export function useArchetypeData() {
  return useQuery({
    queryKey: ['archetype-data-by-format'],
    queryFn: async (): Promise<ArchetypesByFormat[]> => {
      // Query the pre-aggregated materialized view (tiny result set)
      const { data, error } = await supabase
        .from('archetype_stats' as 'community_decks')
        .select('format, archetype, deck_count, primary_colors_str, all_colors');

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const rows = data as unknown as ArchetypeStatsRow[];

      // Group by format
      const grouped = new Map<string, ArchetypeEntry[]>();
      const totals = new Map<string, number>();

      for (const row of rows) {
        const format = row.format ?? 'other';
        if (!grouped.has(format)) {
          grouped.set(format, []);
          totals.set(format, 0);
        }

        const primaryColors = row.primary_colors_str
          ? row.primary_colors_str.split(',').filter(Boolean)
          : (row.all_colors ?? []);

        grouped.get(format)!.push({
          archetype: row.archetype,
          format,
          deckCount: Number(row.deck_count),
          colors: [],
          primaryColors,
        });
        totals.set(format, (totals.get(format) ?? 0) + Number(row.deck_count));
      }

      // Build ordered result
      const result: ArchetypesByFormat[] = [];
      for (const format of FORMAT_ORDER) {
        const archetypes = grouped.get(format);
        if (!archetypes || archetypes.length === 0) continue;

        archetypes.sort((a, b) => b.deckCount - a.deckCount);

        result.push({
          format,
          label: FORMAT_LABELS[format] ?? format,
          archetypes,
          totalDecks: totals.get(format) ?? 0,
        });
      }

      return result;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Simple flat map: archetype → total deck count across all formats */
export function useArchetypeDeckCounts() {
  return useQuery({
    queryKey: ['archetype-deck-counts'],
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase
        .from('archetype_stats' as 'community_decks')
        .select('archetype, deck_count');

      if (error) throw error;
      if (!data || data.length === 0) return new Map();

      const rows = data as unknown as Array<{ archetype: string; deck_count: number }>;
      const counts = new Map<string, number>();
      for (const row of rows) {
        const key = row.archetype.toLowerCase().trim();
        counts.set(key, (counts.get(key) ?? 0) + Number(row.deck_count));
      }
      return counts;
    },
    staleTime: 10 * 60 * 1000,
  });
}
