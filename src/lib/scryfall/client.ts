/**
 * Scryfall API client for Magic: The Gathering card data.
 * Uses local database first, falls back to Scryfall API when data is missing.
 * @module lib/scryfall/client
 */

import type {
  ScryfallCard,
  SearchResult,
  AutocompleteResult,
} from '@/types/card';
import { logger } from '@/lib/core/logger';
import {
  getLocalCardByName,
  getLocalCardsByNames,
  getLocalRandomCard,
  localAutocomplete,
  localCardToScryfallShape,
} from '@/services/local-cards';
import { recordHit } from '@/services/hit-rate-tracker';

const BASE_URL = 'https://api.scryfall.com';
const FETCH_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

// ── In-memory search result cache ─────────────────────────────────────────────
// Keyed by "lang::page::query" so page-2 results are cached independently.
// TTL matches CARD_SEARCH_STALE_TIME_MS in config (15 min).
const SEARCH_CACHE_TTL_MS = 15 * 60 * 1000;
const SEARCH_CACHE_MAX_SIZE = 200;

interface SearchCacheEntry {
  data: SearchResult;
  ts: number;
}

const searchResultCache = new Map<string, SearchCacheEntry>();

function makeSearchCacheKey(
  query: string,
  page: number,
  lang?: string,
): string {
  return `${lang ?? 'en'}::${page}::${query}`;
}

function getSearchCache(key: string): SearchResult | null {
  const entry = searchResultCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > SEARCH_CACHE_TTL_MS) {
    searchResultCache.delete(key);
    return null;
  }
  // LRU touch: delete + re-insert moves entry to end of Map iteration order
  searchResultCache.delete(key);
  searchResultCache.set(key, entry);
  return entry.data;
}

function setSearchCache(key: string, data: SearchResult): void {
  // Evict oldest entry when at capacity
  if (searchResultCache.size >= SEARCH_CACHE_MAX_SIZE) {
    const oldest = searchResultCache.keys().next().value;
    if (oldest) searchResultCache.delete(oldest);
  }
  searchResultCache.set(key, { data, ts: Date.now() });
}

/** Clear the search result cache (useful for forced refresh / tests). */
export function clearSearchCache(): void {
  searchResultCache.clear();
}
// ──────────────────────────────────────────────────────────────────────────────

// Rate limiting: Scryfall asks for 50-100ms between requests
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MIN_REQUEST_INTERVAL = 50; // Scryfall recommends ≥50ms; 100ms was overly conservative

const MAX_QUEUE_SIZE = 10;
const QUEUE_ITEM_TIMEOUT_MS = FETCH_TIMEOUT_MS;
let queuedRequests = 0;
let nextRequestAllowedAt = 0;

/**
 * Fetch wrapper that enforces Scryfall's rate limiting requirements.
 * Uses token-bucket style scheduling so requests only delay when needed.
 * @param url - The URL to fetch
 * @returns The fetch Response
 */
async function rateLimitedFetch(url: string): Promise<Response> {
  if (queuedRequests >= MAX_QUEUE_SIZE) {
    throw new Error('Too many pending requests. Please try again.');
  }

  queuedRequests += 1;

  try {
    const now = Date.now();
    const scheduledAt = Math.max(now, nextRequestAllowedAt);
    const waitMs = scheduledAt - now;
    nextRequestAllowedAt = scheduledAt + MIN_REQUEST_INTERVAL;

    if (waitMs > QUEUE_ITEM_TIMEOUT_MS) {
      throw new Error('Request timed out while waiting in queue');
    }

    if (waitMs > 0) {
      await delay(waitMs);
    }

    return await fetchWithRetry(url);
  } finally {
    queuedRequests = Math.max(0, queuedRequests - 1);
  }
}

async function fetchWithTimeoutWithInit(
  url: string,
  timeoutMs: number,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      credentials: 'omit',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  let attempt = 0;
  let lastError: Error | undefined;

  while (attempt <= retries) {
    try {
      const response = await fetchWithTimeoutWithInit(
        url,
        FETCH_TIMEOUT_MS,
        init,
      );
      if (
        !response.ok &&
        (response.status === 429 || response.status >= 500) &&
        attempt < retries
      ) {
        await delay(300 * (attempt + 1));
        attempt += 1;
        continue;
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= retries) {
        throw lastError;
      }
      await delay(300 * (attempt + 1));
      attempt += 1;
    }
  }

  throw lastError ?? new Error('Request failed');
}

/**
 * Search for cards using Scryfall syntax.
 * @param query - Scryfall search query (e.g., "t:creature c:green cmc<=3")
 * @param page - Page number for paginated results (default: 1)
 * @returns Search results with card data and pagination info
 * @example
 * const results = await searchCards("t:dragon c:red", 1);
 * console.log(results.data); // Array of matching cards
 */
export async function searchCards(
  query: string,
  page: number = 1,
  lang?: string,
): Promise<SearchResult> {
  // When a non-English lang is requested, prepend lang filter
  const langQuery = lang && lang !== 'en' ? `lang:${lang} ${query}` : query;
  // Exclude digital-only cards (Alchemy, rebalanced) — only show paper-legal cards
  const finalQuery = `${langQuery} game:paper`;

  // ── Cache check (avoids API call + queue delay entirely) ───────────────────
  const cacheKey = makeSearchCacheKey(finalQuery, page, lang);
  const cached = getSearchCache(cacheKey);
  if (cached) return cached;
  // ──────────────────────────────────────────────────────────────────────────

  const encodedQuery = encodeURIComponent(finalQuery);
  const response = await rateLimitedFetch(
    `${BASE_URL}/cards/search?q=${encodedQuery}&page=${page}`,
  );

  if (!response.ok) {
    if (response.status === 404) {
      return { object: 'list', total_cards: 0, has_more: false, data: [] };
    }
    throw new Error(`Search failed: ${response.statusText}`);
  }

  const result: SearchResult = await response.json();
  setSearchCache(cacheKey, result);
  return result;
}

interface ScryfallCollectionResponse {
  object: 'list';
  data: ScryfallCard[];
}

/**
 * Fetch many cards by exact name. Checks local database first,
 * then falls back to Scryfall's collection endpoint for missing cards.
 */
export async function getCardsByExactNames(
  names: string[],
): Promise<ScryfallCard[]> {
  if (names.length === 0) return [];

  const uniqueNames = [
    ...new Set(names.map((name) => name.trim()).filter(Boolean)),
  ];

  // Try local DB first
  const localCards = await getLocalCardsByNames(uniqueNames);
  const cards: ScryfallCard[] = [];
  const missingNames: string[] = [];

  for (const name of uniqueNames) {
    const local = localCards.get(name);
    if (local) {
      cards.push(localCardToScryfallShape(local) as ScryfallCard);
    } else {
      missingNames.push(name);
    }
  }

  if (localCards.size > 0) {
    recordHit('local', 'cards_batch', localCards.size);
  }

  // Fetch missing from Scryfall
  if (missingNames.length > 0) {
    logger.info(`Fetching ${missingNames.length}/${uniqueNames.length} cards from Scryfall (not in local DB)`);
    recordHit('scryfall', 'cards_batch', missingNames.length);
    const chunks: string[][] = [];
    for (let i = 0; i < missingNames.length; i += 75) {
      chunks.push(missingNames.slice(i, i + 75));
    }

    for (const chunk of chunks) {
      const response = await fetchWithRetry(`${BASE_URL}/cards/collection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({
          identifiers: chunk.map((name) => ({ name })),
        }),
      });

      if (!response.ok) {
        if (response.status === 404) continue;
        throw new Error(`Collection fetch failed: ${response.statusText}`);
      }

      const result = (await response.json()) as ScryfallCollectionResponse;
      cards.push(...result.data);
    }
  }

  return cards;
}

/**
 * Get card name suggestions for autocomplete.
 * @param query - Partial card name (minimum 2 characters)
 * @returns Array of matching card names
 */
export async function autocomplete(query: string): Promise<string[]> {
  if (query.length < 2) return [];

  // Try local card_names table first
  try {
    const localResults = await localAutocomplete(query);
    if (localResults.length > 0) {
      recordHit('local', 'autocomplete', localResults.length);
      return localResults;
    }
  } catch {
    // Fall through to Scryfall
  }

  const encodedQuery = encodeURIComponent(query);
  const response = await rateLimitedFetch(
    `${BASE_URL}/cards/autocomplete?q=${encodedQuery}`,
  );

  if (!response.ok) return [];

  const data: AutocompleteResult = await response.json();
  recordHit('scryfall', 'autocomplete', data.data.length);
  return data.data;
}

/**
 * Fetch a random Magic card from Scryfall.
 * @returns A random ScryfallCard
 */
export async function getRandomCard(): Promise<ScryfallCard> {
  // Try local DB first (avoids API call entirely)
  try {
    const local = await getLocalRandomCard();
    if (local) {
      recordHit('local', 'random_card');
      return localCardToScryfallShape(local) as ScryfallCard;
    }
  } catch {
    // Fall through to Scryfall
  }

  const response = await rateLimitedFetch(`${BASE_URL}/cards/random`);

  if (!response.ok) {
    throw new Error(`Failed to get random card: ${response.statusText}`);
  }

  recordHit('scryfall', 'random_card');
  return response.json();
}

/**
 * Fetch a specific card by its exact name.
 * @param name - The exact card name to look up
 * @returns The matching ScryfallCard
 * @throws Error if card is not found
 */
export async function getCardByName(name: string): Promise<ScryfallCard> {
  // Try local DB first
  try {
    const local = await getLocalCardByName(name);
    if (local) {
      recordHit('local', 'card_by_name');
      return localCardToScryfallShape(local) as ScryfallCard;
    }
  } catch {
    // Fall through to Scryfall
  }

  const encodedName = encodeURIComponent(name);
  const response = await rateLimitedFetch(
    `${BASE_URL}/cards/named?exact=${encodedName}`,
  );

  if (!response.ok) {
    throw new Error(`Card not found: ${name}`);
  }

  recordHit('scryfall', 'card_by_name');
  return response.json();
}

/**
 * Get the image URL for a card at the specified size.
 * Handles both single-faced and double-faced cards.
 * @param card - The card to get the image for
 * @param size - Image size: "small" (146px), "normal" (488px), or "large" (672px)
 * @param faceIndex - For multi-faced cards, which face to show (0 = front, 1 = back)
 * @returns The image URL, or placeholder if no image available
 */
export function getCardImage(
  card: ScryfallCard,
  size: 'small' | 'normal' | 'large' = 'normal',
  faceIndex: number = 0,
): string {
  if (card.image_uris) {
    return card.image_uris[size];
  }

  if (card.card_faces && card.card_faces[faceIndex]?.image_uris) {
    return card.card_faces[faceIndex].image_uris[size];
  }

  // Fallback to first face if requested face doesn't exist
  if (card.card_faces && card.card_faces[0]?.image_uris) {
    return card.card_faces[0].image_uris[size];
  }

  return '/placeholder.svg';
}

/**
 * Check if a card is double-faced (transform, modal, etc.)
 * @param card - The card to check
 * @returns True if the card has multiple faces with separate images
 */
export function isDoubleFacedCard(card: ScryfallCard): boolean {
  return !!(
    card.card_faces &&
    card.card_faces.length > 1 &&
    card.card_faces[0]?.image_uris
  );
}

/**
 * Get the details for a specific face of a card
 * @param card - The card
 * @param faceIndex - Which face (0 = front, 1 = back)
 * @returns The face data or the card itself if single-faced
 */
export function getCardFaceDetails(
  card: ScryfallCard,
  faceIndex: number = 0,
  locale: string = 'en',
) {
  // Import-free localization: prefer printed_* fields for non-English
  const useLocalized = locale !== 'en';

  if (card.card_faces && card.card_faces[faceIndex]) {
    const face = card.card_faces[faceIndex];
    return {
      name:
        useLocalized && card.printed_name
          ? card.printed_name.split(' // ')[faceIndex] || face.name
          : face.name,
      mana_cost: face.mana_cost,
      type_line:
        useLocalized && card.printed_type_line
          ? card.printed_type_line.split(' // ')[faceIndex] || face.type_line
          : face.type_line,
      oracle_text:
        useLocalized && card.printed_text
          ? card.printed_text
          : face.oracle_text,
      power: face.power,
      toughness: face.toughness,
      flavor_text: face.flavor_text,
    };
  }

  return {
    name: (useLocalized && card.printed_name) || card.name,
    mana_cost: card.mana_cost,
    type_line: (useLocalized && card.printed_type_line) || card.type_line,
    oracle_text: (useLocalized && card.printed_text) || card.oracle_text,
    power: card.power,
    toughness: card.toughness,
    flavor_text: card.flavor_text,
  };
}

/**
 * Get the Tailwind CSS color class for a card's rarity.
 * @param rarity - Card rarity: "mythic", "rare", "uncommon", or "common"
 * @returns Tailwind text color class
 */
export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'mythic':
      return 'text-warning';
    case 'rare':
      return 'text-gold';
    case 'uncommon':
      return 'text-muted-foreground';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * Parse a mana cost string into individual symbol codes.
 * @param manaCost - Mana cost string (e.g., "{2}{W}{U}")
 * @returns Array of symbol codes (e.g., ["2", "W", "U"])
 */
export function formatManaSymbols(manaCost: string): string[] {
  if (!manaCost) return [];
  const symbols = manaCost.match(/\{[^}]+\}/g) || [];
  return symbols.map((s) => s.replace(/[{}]/g, ''));
}

/**
 * Represents a ruling for a card from Scryfall.
 */
export interface CardRuling {
  object: string;
  oracle_id: string;
  source: string;
  published_at: string;
  comment: string;
}

// Cache for rulings to avoid redundant API calls
const rulingsCache = new Map<
  string,
  { data: CardRuling[]; timestamp: number }
>();
const RULINGS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch rulings for a card from Scryfall.
 * Results are cached for 10 minutes to reduce API calls.
 * @param cardId - The Scryfall card ID
 * @returns Array of CardRuling objects
 */
export async function getCardRulings(cardId: string): Promise<CardRuling[]> {
  const cached = rulingsCache.get(cardId);

  if (cached && Date.now() - cached.timestamp < RULINGS_CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await rateLimitedFetch(
      `${BASE_URL}/cards/${cardId}/rulings`,
    );

    if (!response.ok) {
      logger.error(
        'Failed to fetch rulings:',
        response.status,
        response.statusText,
      );
      return [];
    }

    const data = await response.json();
    const rulings: CardRuling[] = data.data || [];

    rulingsCache.set(cardId, { data: rulings, timestamp: Date.now() });

    return rulings;
  } catch (error) {
    logger.error('Failed to fetch rulings:', error);
    return [];
  }
}
