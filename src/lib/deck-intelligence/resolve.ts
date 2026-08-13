/**
 * Resolve raw decklist entries against the OffMeta card database + ontology.
 *
 * Uses local tables first (card_names → cards) and the deterministic
 * public.get_card_ontology RPC. Never calls Scryfall.
 */

import { supabase } from '@/integrations/supabase/client';
import type { ResolvedDeckCard } from './analyze';

const CHUNK = 150;

function chunked<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

interface DeckEntry {
  name: string;
  quantity: number;
}

/**
 * Match decklist entries to oracle ids and ontology tags.
 * Unmatched names are returned with `oracleId: null` so the UI can report them.
 */
export async function resolveDeckCards(
  entries: DeckEntry[],
): Promise<ResolvedDeckCard[]> {
  if (entries.length === 0) return [];

  const lowered = Array.from(
    new Set(entries.map((e) => e.name.toLowerCase())),
  );

  // 1. Canonicalise names (handles casing and stored display form).
  const canonical = new Map<string, string>();
  for (const batch of chunked(lowered, CHUNK)) {
    const { data, error } = await supabase
      .from('card_names')
      .select('name_lower, name')
      .in('name_lower', batch);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) canonical.set(row.name_lower, row.name);
  }

  const canonicalNames = Array.from(new Set([...canonical.values()]));

  // 2. Look up oracle metadata.
  const byName = new Map<string, { oracleId: string; typeLine: string | null }>();
  for (const batch of chunked(canonicalNames, CHUNK)) {
    const { data, error } = await supabase
      .from('cards')
      .select('oracle_id, name, type_line')
      .in('name', batch);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (!byName.has(row.name)) {
        byName.set(row.name, {
          oracleId: row.oracle_id,
          typeLine: row.type_line,
        });
      }
    }
  }

  // 3. Fetch deterministic ontology tags for the resolved oracle ids.
  const oracleIds = Array.from(new Set([...byName.values()].map((v) => v.oracleId)));
  const tagsByOracle = new Map<string, string[]>();
  for (const batch of chunked(oracleIds, CHUNK)) {
    const { data, error } = await supabase.rpc('get_card_ontology', {
      p_oracle_ids: batch,
    });
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const list = tagsByOracle.get(row.oracle_id) ?? [];
      list.push(row.tag_key);
      tagsByOracle.set(row.oracle_id, list);
    }
  }

  return entries.map((entry) => {
    const display = canonical.get(entry.name.toLowerCase());
    const meta = display ? byName.get(display) : undefined;
    return {
      name: display ?? entry.name,
      quantity: entry.quantity,
      oracleId: meta?.oracleId ?? null,
      typeLine: meta?.typeLine ?? null,
      tags: meta ? (tagsByOracle.get(meta.oracleId) ?? []) : [],
    };
  });
}
