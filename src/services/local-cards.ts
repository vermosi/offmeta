/**
 * Local card data service — queries the local database first,
 * falling back to Scryfall API only when data is missing.
 *
 * This reduces Scryfall API strain by leveraging the ~30k+ cards
 * backfilled via bulk-data-sync.
 *
 * @module services/local-cards
 */

import type { ScryfallCard } from '@/types/card';
import { logger } from '@/lib/core/logger';
import { recordHit } from '@/services/hit-rate-tracker';
import { env } from '@/lib/core/env';

// ── In-memory caches ────────────────────────────────────────────────────────

const cardByNameCache = new Map<string, LocalCard | null>();
const CARD_CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
const cardCacheTimestamps = new Map<string, number>();

function hasSupabaseConfig(): boolean {
  try {
    if (
      import.meta.env.MODE === 'test' ||
      (typeof import.meta !== 'undefined' && (import.meta as { vitest?: unknown }).vitest)
    ) {
      return false;
    }
    return Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY);
  } catch {
    return false;
  }
}

async function getSupabaseClient() {
  const { supabase } = await import('@/integrations/supabase/client');
  return supabase;
}

export interface LocalCard {
  oracle_id: string;
  name: string;
  mana_cost: string | null;
  type_line: string | null;
  oracle_text: string | null;
  colors: string[];
  cmc: number;
  image_url: string | null;
  rarity: string | null;
  legalities: Record<string, string> | null;
}

export interface LocalCardPrice {
  card_name: string;
  price_usd: number | null;
  price_usd_foil: number | null;
  scryfall_id: string | null;
}

export interface LocalCardPrinting {
  id: string;
  scryfall_id: string | null;
  oracle_id: string;
  mtgjson_uuid: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string | null;
  artist: string | null;
  prices: {
    usd?: string;
    usd_foil?: string;
    eur?: string;
    eur_foil?: string;
    tix?: string;
  } | null;
  image_url: string | null;
  purchase_uris: {
    tcgplayer?: string;
    cardmarket?: string;
    cardhoarder?: string;
  } | null;
  identifiers: Record<string, unknown> | null;
  related_cards: Record<string, unknown> | null;
  released_at: string | null;
  lang: string;
}

// ── Card lookups ────────────────────────────────────────────────────────────

/**
 * Look up a card by exact name from the local database.
 * Returns null if not found locally.
 */
export async function getLocalCardByName(name: string): Promise<LocalCard | null> {
  if (!hasSupabaseConfig()) return null;
  const key = name.toLowerCase();
  const cached = cardByNameCache.get(key);
  const ts = cardCacheTimestamps.get(key);
  if (cached !== undefined && ts && Date.now() - ts < CARD_CACHE_TTL_MS) {
    return cached;
  }

  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('cards')
      .select('oracle_id, name, mana_cost, type_line, oracle_text, colors, cmc, image_url, rarity, legalities')
      .ilike('name', name)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      cardByNameCache.set(key, null);
      cardCacheTimestamps.set(key, Date.now());
      return null;
    }

    const card: LocalCard = {
      oracle_id: data.oracle_id,
      name: data.name,
      mana_cost: data.mana_cost,
      type_line: data.type_line,
      oracle_text: data.oracle_text,
      colors: data.colors ?? [],
      cmc: data.cmc ?? 0,
      image_url: data.image_url,
      rarity: data.rarity,
      legalities: data.legalities as Record<string, string> | null,
    };

    cardByNameCache.set(key, card);
    cardCacheTimestamps.set(key, Date.now());
    return card;
  } catch (err) {
    logger.error('Local card lookup failed', err);
    return null;
  }
}

/**
 * Look up multiple cards by name from local database.
 * Returns a Map of name → LocalCard for found cards.
 */
export async function getLocalCardsByNames(names: string[]): Promise<Map<string, LocalCard>> {
  const result = new Map<string, LocalCard>();
  if (names.length === 0) return result;
  if (!hasSupabaseConfig()) return result;

  // Check cache first, collect misses
  const uncached: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    const cached = cardByNameCache.get(key);
    const ts = cardCacheTimestamps.get(key);
    if (cached !== undefined && ts && Date.now() - ts < CARD_CACHE_TTL_MS) {
      if (cached) result.set(cached.name, cached);
    } else {
      uncached.push(name);
    }
  }

  if (uncached.length === 0) return result;

  try {
    const supabase = await getSupabaseClient();
    // Query in batches of 100 to avoid payload limits
    for (let i = 0; i < uncached.length; i += 100) {
      const batch = uncached.slice(i, i + 100);
      const { data, error } = await supabase
        .from('cards')
        .select('oracle_id, name, mana_cost, type_line, oracle_text, colors, cmc, image_url, rarity, legalities')
        .in('name', batch);

      if (error || !data) continue;

      for (const row of data) {
        const card: LocalCard = {
          oracle_id: row.oracle_id,
          name: row.name,
          mana_cost: row.mana_cost,
          type_line: row.type_line,
          oracle_text: row.oracle_text,
          colors: row.colors ?? [],
          cmc: row.cmc ?? 0,
          image_url: row.image_url,
          rarity: row.rarity,
          legalities: row.legalities as Record<string, string> | null,
        };
        result.set(card.name, card);
        cardByNameCache.set(card.name.toLowerCase(), card);
        cardCacheTimestamps.set(card.name.toLowerCase(), Date.now());
      }

      // Mark not-found cards as null in cache
      for (const name of batch) {
        if (!result.has(name)) {
          cardByNameCache.set(name.toLowerCase(), null);
          cardCacheTimestamps.set(name.toLowerCase(), Date.now());
        }
      }
    }
  } catch (err) {
    logger.error('Batch local card lookup failed', err);
  }

  return result;
}

/**
 * Get a random card from the local database.
 * Uses a random offset query. Falls back to null if DB is empty.
 */
export async function getLocalRandomCard(): Promise<LocalCard | null> {
  if (!hasSupabaseConfig()) return null;
  try {
    const supabase = await getSupabaseClient();
    // Get approximate count first, then random offset
    const { count } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true });

    if (!count || count === 0) return null;

    const offset = Math.floor(Math.random() * count);
    const { data, error } = await supabase
      .from('cards')
      .select('oracle_id, name, mana_cost, type_line, oracle_text, colors, cmc, image_url, rarity, legalities')
      .range(offset, offset)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      oracle_id: data.oracle_id,
      name: data.name,
      mana_cost: data.mana_cost,
      type_line: data.type_line,
      oracle_text: data.oracle_text,
      colors: data.colors ?? [],
      cmc: data.cmc ?? 0,
      image_url: data.image_url,
      rarity: data.rarity,
      legalities: data.legalities as Record<string, string> | null,
    };
  } catch (err) {
    logger.error('Random card fetch failed', err);
    return null;
  }
}

// ── Autocomplete ────────────────────────────────────────────────────────────

/**
 * Autocomplete card names from the local card_names table.
 * Falls back to empty array on error.
 */
export async function localAutocomplete(query: string): Promise<string[]> {
  if (query.length < 2) return [];
  if (!hasSupabaseConfig()) return [];

  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('card_names')
      .select('name')
      .ilike('name_lower', `${query.toLowerCase()}%`)
      .limit(20);

    if (error || !data) return [];
    return data.map((r) => r.name);
  } catch {
    return [];
  }
}

// ── Prices ──────────────────────────────────────────────────────────────────

/**
 * Get latest prices for a list of card names from price_snapshots.
 * Returns a Map of card_name → { price_usd, price_usd_foil }.
 */
export async function getLocalPrices(
  cardNames: string[],
): Promise<Map<string, LocalCardPrice>> {
  const result = new Map<string, LocalCardPrice>();
  if (cardNames.length === 0) return result;
  if (!hasSupabaseConfig()) return result;

  try {
    const supabase = await getSupabaseClient();
    // Use distinct-on to get only the latest snapshot per card
    // Query in batches
    for (let i = 0; i < cardNames.length; i += 100) {
      const batch = cardNames.slice(i, i + 100);
      const { data, error } = await supabase
        .from('price_snapshots')
        .select('card_name, price_usd, price_usd_foil, scryfall_id')
        .in('card_name', batch)
        .order('recorded_at', { ascending: false });

      if (error || !data) continue;

      // Only keep the first (latest) entry per card_name
      for (const row of data) {
        if (!result.has(row.card_name)) {
          result.set(row.card_name, {
            card_name: row.card_name,
            price_usd: row.price_usd ? Number(row.price_usd) : null,
            price_usd_foil: row.price_usd_foil ? Number(row.price_usd_foil) : null,
            scryfall_id: row.scryfall_id,
          });
        }
      }
    }

    if (result.size > 0) {
      recordHit('local', 'price_lookup', result.size);
    }
  } catch (err) {
    logger.error('Local price lookup failed', err);
  }

  return result;
}

/**
 * Get all known printings for a card name from the local card_printings table.
 * Returns printings ordered by release date descending when available.
 */
export async function getLocalCardPrintings(
  cardName: string,
): Promise<LocalCardPrinting[]> {
  const trimmed = cardName.trim();
  if (!trimmed) return [];
  if (!hasSupabaseConfig()) return [];

  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await (supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          ilike: (col: string, val: string) => {
            order: (col: string, opts: { ascending: boolean; nullsFirst?: boolean }) => {
              order: (
                col: string,
                opts: { ascending: boolean },
              ) => Promise<{ data: LocalCardPrinting[] | null; error: unknown }>;
            };
          };
        };
      };
    })
      .from('card_printings')
      .select(
        'id, scryfall_id, mtgjson_uuid, oracle_id, name, set, set_name, collector_number, rarity, artist, prices, image_url, purchase_uris, identifiers, related_cards, released_at, lang',
      )
      .ilike('name', trimmed)
      .order('released_at', { ascending: false, nullsFirst: false })
      .order('collector_number', { ascending: true });

    if (error || !data) return [];
    return data as LocalCardPrinting[];
  } catch (err) {
    logger.error('Local card printings lookup failed', err);
    return [];
  }
}

/**
 * Get image URL for a card from local DB. Returns null if not found.
 */
export async function getLocalCardImage(cardName: string): Promise<string | null> {
  const card = await getLocalCardByName(cardName);
  return card?.image_url ?? null;
}

// ── Conversion helpers ──────────────────────────────────────────────────────

/**
 * Convert a LocalCard to a partial ScryfallCard shape for compatibility.
 * Useful for components that expect ScryfallCard but can work with local data.
 */
export function localCardToScryfallShape(card: LocalCard): Partial<ScryfallCard> {
  return {
    name: card.name,
    mana_cost: card.mana_cost ?? undefined,
    type_line: card.type_line ?? undefined,
    oracle_text: card.oracle_text ?? undefined,
    colors: card.colors,
    cmc: card.cmc,
    rarity: card.rarity ?? 'common',
    image_uris: card.image_url
      ? { small: card.image_url, normal: card.image_url, large: card.image_url, png: card.image_url, art_crop: card.image_url, border_crop: card.image_url }
      : undefined,
    legalities: card.legalities as Record<string, string> | undefined,
  };
}
