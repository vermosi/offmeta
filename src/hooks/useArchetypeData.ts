/**
 * Hook to fetch archetype data from community_decks, grouped by format.
 * Returns structured data for the data-driven archetypes UI.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ArchetypeEntry {
  archetype: string;
  format: string;
  deckCount: number;
  colors: string[][]; // array of color arrays from decks
  /** Most common color identity across decks of this archetype+format */
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

function getMostCommonColors(colorArrays: string[][]): string[] {
  if (colorArrays.length === 0) return [];

  // Count frequency of each color combo (as sorted string)
  const freq = new Map<string, { count: number; colors: string[] }>();
  for (const colors of colorArrays) {
    const key = [...colors].sort().join(',');
    const existing = freq.get(key);
    if (existing) {
      existing.count++;
    } else {
      freq.set(key, { count: 1, colors });
    }
  }

  // Return the most frequent
  let best: { count: number; colors: string[] } = { count: 0, colors: [] };
  for (const entry of freq.values()) {
    if (entry.count > best.count) best = entry;
  }

  // If no dominant combo, return unique colors across all decks
  if (best.count === 1 && colorArrays.length > 1) {
    const allColors = new Set<string>();
    for (const colors of colorArrays) {
      for (const c of colors) allColors.add(c);
    }
    return ['W', 'U', 'B', 'R', 'G'].filter((c) => allColors.has(c));
  }

  return best.colors;
}

export function useArchetypeData() {
  return useQuery({
    queryKey: ['archetype-data-by-format'],
    queryFn: async (): Promise<ArchetypesByFormat[]> => {
      const { data, error } = await supabase
        .from('community_decks')
        .select('format, archetype, colors')
        .not('archetype', 'is', null);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Group by format → archetype
      const grouped = new Map<string, Map<string, { count: number; colors: string[][] }>>();

      for (const row of data) {
        const format = row.format ?? 'other';
        const archetype = row.archetype!;
        const colors = (row.colors ?? []) as string[];

        if (!grouped.has(format)) grouped.set(format, new Map());
        const formatMap = grouped.get(format)!;

        if (!formatMap.has(archetype)) {
          formatMap.set(archetype, { count: 0, colors: [] });
        }
        const entry = formatMap.get(archetype)!;
        entry.count++;
        if (colors.length > 0) entry.colors.push(colors);
      }

      // Build result
      const result: ArchetypesByFormat[] = [];

      for (const format of FORMAT_ORDER) {
        const formatMap = grouped.get(format);
        if (!formatMap || formatMap.size === 0) continue;

        const archetypes: ArchetypeEntry[] = [];
        let totalDecks = 0;

        for (const [archetype, entry] of formatMap.entries()) {
          totalDecks += entry.count;
          archetypes.push({
            archetype,
            format,
            deckCount: entry.count,
            colors: entry.colors,
            primaryColors: getMostCommonColors(entry.colors),
          });
        }

        // Sort by deck count desc
        archetypes.sort((a, b) => b.deckCount - a.deckCount);

        result.push({
          format,
          label: FORMAT_LABELS[format] ?? format,
          archetypes,
          totalDecks,
        });
      }

      return result;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Simple flat map for backward compat: archetype → total deck count across all formats */
export function useArchetypeDeckCounts() {
  return useQuery({
    queryKey: ['archetype-deck-counts'],
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase
        .from('community_decks')
        .select('archetype');

      if (error) throw error;
      if (!data || data.length === 0) return new Map();

      const counts = new Map<string, number>();
      for (const row of data) {
        if (!row.archetype) continue;
        const key = row.archetype.toLowerCase().trim();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return counts;
    },
    staleTime: 10 * 60 * 1000,
  });
}
