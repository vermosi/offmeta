/**
 * Card Name Lookup — In-memory cache backed by card_names table
 *
 * Loads all card names on first use, then serves lookups from memory.
 * Refreshes every 24h to pick up new cards.
 *
 * @module semantic-search/card-name-lookup
 */

import { supabase } from './client.ts';

let cardNamesSet: Set<string> | null = null;
let lastLoadTime = 0;
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PAGE_SIZE = 5000;

/**
 * Eagerly start loading card names at module import time.
 * This ensures cold starts pay the DB cost during boot, not on first search.
 */
const _eagerLoad = loadCardNames().then((names) => {
  cardNamesSet = names;
  lastLoadTime = Date.now();
}).catch((err) => {
  console.warn('[card-name-lookup] Eager load failed, will retry on first lookup:', err);
});

/**
 * Loads all card names from the card_names table into an in-memory Set.
 * Uses pagination to handle 30k+ rows.
 */
async function loadCardNames(): Promise<Set<string>> {
  const names = new Set<string>();
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('card_names')
      .select('name_lower')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error(`[card-name-lookup] Failed to load card names: ${error.message}`);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      for (const row of data) {
        names.add(row.name_lower);
      }
      from += PAGE_SIZE;
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      }
    }
  }

  return names;
}

/**
 * Returns the cached card names Set, loading from DB if needed.
 * On cold start, awaits the eager load promise to avoid duplicate DB calls.
 */
async function getCardNames(): Promise<Set<string>> {
  const now = Date.now();
  if (cardNamesSet && now - lastLoadTime < REFRESH_INTERVAL_MS) {
    return cardNamesSet;
  }

  // If eager load is still in progress, wait for it
  if (!cardNamesSet && _eagerLoad) {
    await _eagerLoad;
    if (cardNamesSet) return cardNamesSet;
  }

  cardNamesSet = await loadCardNames();
  lastLoadTime = now;
  return cardNamesSet;
}

/**
 * Checks if the query exactly matches a known card name.
 * Returns the matched name (lowercased) or null.
 */
export async function lookupCardName(query: string): Promise<boolean> {
  const names = await getCardNames();
  if (names.size === 0) {
    // Table not populated yet — fall back to heuristic
    return false;
  }
  return names.has(query.toLowerCase().trim());
}

/**
 * Returns the number of card names currently loaded.
 * Useful for diagnostics.
 */
export function getLoadedCount(): number {
  return cardNamesSet?.size ?? 0;
}

/**
 * Returns diagnostic info about the card name index.
 */
export function getCardNameDiagnostics(): {
  loadedCount: number;
  lastLoadTime: number;
  lastLoadTimeISO: string | null;
  isLoaded: boolean;
  refreshIntervalMs: number;
  nextRefreshAt: string | null;
} {
  const loaded = cardNamesSet !== null;
  return {
    loadedCount: cardNamesSet?.size ?? 0,
    lastLoadTime,
    lastLoadTimeISO: lastLoadTime ? new Date(lastLoadTime).toISOString() : null,
    isLoaded: loaded,
    refreshIntervalMs: REFRESH_INTERVAL_MS,
    nextRefreshAt: lastLoadTime
      ? new Date(lastLoadTime + REFRESH_INTERVAL_MS).toISOString()
      : null,
  };
}
