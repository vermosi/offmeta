/**
 * Card printings and purchase URL utilities.
 * Fetches all printings of a card and generates marketplace links.
 * @module lib/card-printings
 */

import type { ScryfallCard } from '@/types/card';
import { logger } from '@/lib/logger';

const BASE_URL = 'https://api.scryfall.com';

export interface CardPrinting {
  id: string;
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  artist?: string;
  prices: {
    usd?: string;
    usd_foil?: string;
    eur?: string;
    eur_foil?: string;
    tix?: string;
  };
  image_uris?: {
    small: string;
    normal: string;
    large: string;
  };
  purchase_uris?: {
    tcgplayer?: string;
    cardmarket?: string;
    cardhoarder?: string;
  };
  released_at: string;
  lang: string;
}

export interface PrintingsResult {
  object: string;
  total_cards: number;
  has_more: boolean;
  data: ScryfallCard[];
}

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100;

// Cache for printings to avoid redundant API calls
const printingsCache = new Map<
  string,
  { data: CardPrinting[]; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const FETCH_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      credentials: 'omit',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry(
  url: string,
  retries = MAX_RETRIES,
): Promise<Response> {
  let attempt = 0;
  let lastError: Error | undefined;

  while (attempt <= retries) {
    try {
      const response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
      if (
        !response.ok &&
        (response.status === 429 || response.status >= 500) &&
        attempt < retries
      ) {
        await sleep(300 * (attempt + 1));
        attempt += 1;
        continue;
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= retries) {
        throw lastError;
      }
      await sleep(300 * (attempt + 1));
      attempt += 1;
    }
  }

  throw lastError ?? new Error('Request failed');
}

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest),
    );
  }

  lastRequestTime = Date.now();
  return fetchWithRetry(url);
}

/**
 * Fetch all printings of a card from Scryfall.
 * Results are cached for 5 minutes to reduce API calls.
 * @param cardName - The exact card name to look up
 * @returns Array of CardPrinting objects with set/price info
 */
export async function getCardPrintings(
  cardName: string,
): Promise<CardPrinting[]> {
  const cacheKey = cardName.toLowerCase();
  const cached = printingsCache.get(cacheKey);

  // Return cached data if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Search for all printings of this card
    const encodedName = encodeURIComponent(`!"${cardName}" unique:prints`);
    const response = await rateLimitedFetch(
      `${BASE_URL}/cards/search?q=${encodedName}&order=released`,
    );

    if (!response.ok) {
      return [];
    }

    const data: PrintingsResult = await response.json();

    const printings = data.data.map((card) => {
      // Some cards (like Secret Lair or double-faced) have images in card_faces instead of image_uris
      let imageUris = card.image_uris;
      if (!imageUris && card.card_faces && card.card_faces.length > 0) {
        imageUris = card.card_faces[0].image_uris;
      }

      return {
        id: card.id,
        set: card.set,
        set_name: card.set_name,
        collector_number: card.collector_number ?? '',
        rarity: card.rarity,
        artist: card.artist,
        prices: card.prices,
        image_uris: imageUris,
        purchase_uris: card.purchase_uris,
        released_at: card.released_at ?? '',
        lang: card.lang ?? 'en',
      };
    });

    // Cache the result
    printingsCache.set(cacheKey, { data: printings, timestamp: Date.now() });

    return printings;
  } catch (error) {
    logger.error('Failed to fetch printings:', error);
    return [];
  }
}

/**
 * Generate a TCGPlayer purchase URL for a card.
 * Uses affiliate link if configured, otherwise falls back to direct TCGPlayer URLs.
 * @param card - The card to generate a URL for
 * @returns TCGPlayer URL for purchasing the card (with affiliate tracking if configured)
 */
export function getTCGPlayerUrl(card: ScryfallCard): string {
  const metaEnv = (() => {
    try {
      return import.meta.env;
    } catch {
      return undefined;
    }
  })();
  const processEnv = typeof process !== 'undefined' ? process.env : undefined;
  const affiliateBase =
    metaEnv?.NEXT_PUBLIC_TCGPLAYER_IMPACT_BASE ??
    processEnv?.NEXT_PUBLIC_TCGPLAYER_IMPACT_BASE;
  const purchaseUris = card.purchase_uris;

  // Get the base TCGPlayer URL
  let tcgplayerUrl = purchaseUris?.tcgplayer;
  if (!tcgplayerUrl) {
    tcgplayerUrl = `https://www.tcgplayer.com/search/magic/product?productLineName=magic&q=${encodeURIComponent(card.name)}`;
  }

  // If affiliate base is configured, wrap the URL
  if (affiliateBase) {
    return `${affiliateBase}${encodeURIComponent(tcgplayerUrl)}`;
  }

  return tcgplayerUrl;
}

/**
 * Generate a Cardmarket purchase URL for a card.
 * Uses the card's embedded purchase URI if available, otherwise falls back to search.
 * @param card - The card to generate a URL for
 * @returns Cardmarket URL for purchasing the card
 */
export function getCardmarketUrl(card: ScryfallCard): string {
  const purchaseUris = card.purchase_uris;
  if (purchaseUris?.cardmarket) {
    return purchaseUris.cardmarket;
  }
  // Fallback to search
  return `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(card.name)}`;
}
