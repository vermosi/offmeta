/**
 * Hook to fetch pre-aggregated archetype stats from a materialized view.
 * Returns structured data for the two-tier metagame display:
 * Format → Macro Category → Specific Deck Names
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ArchetypeEntry {
  archetype: string;
  deckName: string;
  macroArchetype: string;
  format: string;
  deckCount: number;
  metaPercentage: number;
  primaryColors: string[];
}

export interface MacroGroup {
  macro: string;
  decks: ArchetypeEntry[];
  totalDecks: number;
  metaPercentage: number;
}

export interface ArchetypesByFormat {
  format: string;
  label: string;
  macroGroups: MacroGroup[];
  totalDecks: number;
}

const FORMAT_LABELS: Record<string, string> = {
  commander: 'Commander',
  standard: 'Standard',
  pioneer: 'Pioneer',
  modern: 'Modern',
  legacy: 'Legacy',
  vintage: 'Vintage',
  pauper: 'Pauper',
  premodern: 'Premodern',
  other: 'Other',
};

const FORMAT_ORDER = ['commander', 'standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper', 'premodern', 'other'];
const MACRO_ORDER = ['Aggro', 'Midrange', 'Control', 'Combo'];

interface ArchetypeStatsRow {
  format: string;
  macro_archetype: string | null;
  deck_name: string | null;
  archetype: string | null;
  deck_count: number;
  meta_percentage: number | null;
  all_colors: string[] | null;
}

export function useArchetypeData() {
  return useQuery({
    queryKey: ['archetype-data-by-format'],
    queryFn: async (): Promise<ArchetypesByFormat[]> => {
      const { data, error } = await supabase
        .from('archetype_stats' as 'community_decks')
        .select('format, macro_archetype, deck_name, archetype, deck_count, meta_percentage, all_colors');

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const rows = data as unknown as ArchetypeStatsRow[];

      // Group by format → macro → decks
      const formatMap = new Map<string, Map<string, ArchetypeEntry[]>>();
      const formatTotals = new Map<string, number>();

      for (const row of rows) {
        const format = row.format ?? 'other';
        const macro = row.macro_archetype ?? 'Midrange';
        const deckName = row.deck_name ?? row.archetype ?? 'Unknown';

        if (!formatMap.has(format)) {
          formatMap.set(format, new Map());
          formatTotals.set(format, 0);
        }

        const macroMap = formatMap.get(format)!;
        if (!macroMap.has(macro)) macroMap.set(macro, []);

        macroMap.get(macro)!.push({
          archetype: row.archetype ?? '',
          deckName,
          macroArchetype: macro,
          format,
          deckCount: Number(row.deck_count),
          metaPercentage: Number(row.meta_percentage ?? 0),
          primaryColors: row.all_colors ?? [],
        });

        formatTotals.set(format, (formatTotals.get(format) ?? 0) + Number(row.deck_count));
      }

      // Build ordered result
      const result: ArchetypesByFormat[] = [];
      for (const format of FORMAT_ORDER) {
        const macroMap = formatMap.get(format);
        if (!macroMap) continue;

        const macroGroups: MacroGroup[] = [];
        for (const macro of MACRO_ORDER) {
          const decks = macroMap.get(macro);
          if (!decks || decks.length === 0) continue;

          decks.sort((a, b) => b.deckCount - a.deckCount);
          const groupTotal = decks.reduce((sum, d) => sum + d.deckCount, 0);
          const formatTotal = formatTotals.get(format) ?? 1;

          macroGroups.push({
            macro,
            decks,
            totalDecks: groupTotal,
            metaPercentage: Math.round((groupTotal / formatTotal) * 100),
          });
        }

        if (macroGroups.length === 0) continue;

        result.push({
          format,
          label: FORMAT_LABELS[format] ?? format,
          macroGroups,
          totalDecks: formatTotals.get(format) ?? 0,
        });
      }

      return result;
    },
    staleTime: 30 * 60 * 1000, // 30 min — materialized view refreshes daily
    gcTime: 60 * 60 * 1000, // keep in cache 1 hour
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
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/** Fetch trend data: compare current counts to a prior snapshot */
export interface TrendData {
  deckName: string;
  format: string;
  currentCount: number;
  previousCount: number;
  change: number; // percentage point change
  direction: 'up' | 'down' | 'stable' | 'new';
}

export function useArchetypeTrends(format: string | null) {
  return useQuery({
    queryKey: ['archetype-trends', format],
    queryFn: async (): Promise<Map<string, TrendData>> => {
      if (!format) return new Map();

      const today = new Date();
      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      // Get latest and 2-weeks-ago snapshots
      const { data: latestSnaps } = await supabase
        .from('archetype_snapshots')
        .select('deck_name, deck_count, snapshot_date')
        .eq('format', format)
        .gte('snapshot_date', today.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: false });

      const { data: priorSnaps } = await supabase
        .from('archetype_snapshots')
        .select('deck_name, deck_count, snapshot_date')
        .eq('format', format)
        .lte('snapshot_date', twoWeeksAgo.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: false });

      const trends = new Map<string, TrendData>();

      // Build current counts
      const currentCounts = new Map<string, number>();
      for (const snap of latestSnaps ?? []) {
        if (!currentCounts.has(snap.deck_name)) {
          currentCounts.set(snap.deck_name, snap.deck_count);
        }
      }

      // Build prior counts
      const priorCounts = new Map<string, number>();
      for (const snap of priorSnaps ?? []) {
        if (!priorCounts.has(snap.deck_name)) {
          priorCounts.set(snap.deck_name, snap.deck_count);
        }
      }

      // Calculate trends
      for (const [name, current] of currentCounts) {
        const previous = priorCounts.get(name);
        if (previous === undefined) {
          trends.set(name, { deckName: name, format, currentCount: current, previousCount: 0, change: 0, direction: 'new' });
        } else {
          const change = current - previous;
          trends.set(name, {
            deckName: name,
            format,
            currentCount: current,
            previousCount: previous,
            change,
            direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
          });
        }
      }

      return trends;
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!format,
  });
}
