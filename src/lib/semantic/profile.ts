/**
 * Typed access to the OffMeta semantic data layer.
 *
 * All calls go straight to the read-only database functions — no edge
 * function hop — so internal consumers (card pages, search ranking, deck
 * check) share exactly the dataset the public API exposes.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ApproachRef,
  CardProfile,
  ConceptDimension,
  ConceptDirectoryEntry,
  ConceptRef,
  ConceptSearchHit,
  ConceptSearchOptions,
} from './types';

const MAX_NAMES = 50;

function toConceptRefs(value: unknown): ConceptRef[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const item = raw as Record<string, unknown>;
    return {
      key: String(item.key ?? ''),
      label: String(item.label ?? ''),
      description: item.description == null ? null : String(item.description),
    };
  });
}

function toApproachRefs(value: unknown): ApproachRef[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const item = raw as Record<string, unknown>;
    return { key: String(item.key ?? ''), label: String(item.label ?? '') };
  });
}

function toCardProfile(raw: unknown): CardProfile {
  const row = raw as Record<string, unknown>;
  return {
    oracleId: String(row.oracle_id ?? ''),
    name: String(row.name ?? ''),
    manaCost: row.mana_cost == null ? null : String(row.mana_cost),
    cmc: Number(row.cmc ?? 0),
    typeLine: row.type_line == null ? null : String(row.type_line),
    colors: Array.isArray(row.colors) ? row.colors.map(String) : [],
    rarity: row.rarity == null ? null : String(row.rarity),
    legalities: (row.legalities as Record<string, string>) ?? {},
    imageUrl: row.image_url == null ? null : String(row.image_url),
    roles: toConceptRefs(row.roles),
    methods: toConceptRefs(row.methods),
    problems: toConceptRefs(row.problems),
    characteristics: toConceptRefs(row.characteristics),
    approaches: toApproachRefs(row.approaches),
  };
}

/**
 * Fetch functional profiles for up to 50 cards, looked up by exact name.
 * Names that do not resolve are simply absent from the result.
 */
export async function getCardProfiles(names: string[]): Promise<CardProfile[]> {
  const cleaned = Array.from(
    new Set(names.map((name) => name.trim()).filter((name) => name.length > 0)),
  ).slice(0, MAX_NAMES);
  if (cleaned.length === 0) return [];

  const { data, error } = await supabase.rpc('get_card_profiles', {
    p_names: cleaned,
  });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data.map(toCardProfile) : [];
}

/** Convenience wrapper for a single card. */
export async function getCardProfile(name: string): Promise<CardProfile | null> {
  const [profile] = await getCardProfiles([name]);
  return profile ?? null;
}

/** Find cards by functional concept rather than by oracle text. */
export async function searchByConcepts(
  conceptKeys: string[],
  options: ConceptSearchOptions = {},
): Promise<ConceptSearchHit[]> {
  const concepts = Array.from(
    new Set(conceptKeys.map((key) => key.trim()).filter((key) => key.length > 0)),
  );
  if (concepts.length === 0) return [];

  const colors = (options.colors ?? [])
    .map((color) => color.toUpperCase())
    .filter((color) => ['W', 'U', 'B', 'R', 'G'].includes(color));

  const { data, error } = await supabase.rpc('search_card_profiles', {
    p_tag_keys: concepts,
    p_colors: colors.length > 0 ? colors : undefined,
    p_match: options.match === 'all' ? 'all' : 'any',
    p_limit: Math.min(Math.max(options.limit ?? 40, 1), 200),
  });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    oracleId: row.oracle_id,
    name: row.name,
    manaCost: row.mana_cost,
    cmc: Number(row.cmc ?? 0),
    typeLine: row.type_line,
    colors: row.colors ?? [],
    rarity: row.rarity,
    imageUrl: row.image_url,
    matchedTags: row.matched_tags ?? [],
    matchCount: Number(row.match_count ?? 0),
  }));
}

/** The full concept directory, ordered by dimension then priority. */
export async function listConcepts(): Promise<ConceptDirectoryEntry[]> {
  const { data, error } = await supabase.rpc('list_ontology_concepts');
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    tagKey: row.tag_key,
    dimension: row.dimension as ConceptDimension,
    label: row.label,
    description: row.description,
    cardCount: Number(row.card_count ?? 0),
    approaches: row.approaches ?? [],
    related: row.related ?? [],
  }));
}
