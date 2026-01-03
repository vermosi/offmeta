/**
 * Card printings and purchase URL utilities.
 * Fetches all printings of a card and generates marketplace links.
 * @module lib/card-printings
 */

import { ScryfallCard } from "@/types/card";

const BASE_URL = "https://api.scryfall.com";

export interface CardPrinting {
  id: string;
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
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
const printingsCache = new Map<string, { data: CardPrinting[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  return fetch(url);
}

/**
 * Fetch all printings of a card from Scryfall.
 * Results are cached for 5 minutes to reduce API calls.
 * @param cardName - The exact card name to look up
 * @returns Array of CardPrinting objects with set/price info
 */
export async function getCardPrintings(cardName: string): Promise<CardPrinting[]> {
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
      `${BASE_URL}/cards/search?q=${encodedName}&order=released`
    );
    
    if (!response.ok) {
      return [];
    }
    
    const data: PrintingsResult = await response.json();
    
    const printings = data.data.map((card) => ({
      id: card.id,
      set: card.set,
      set_name: card.set_name,
      collector_number: (card as any).collector_number || "",
      rarity: card.rarity,
      prices: card.prices,
      image_uris: card.image_uris,
      purchase_uris: (card as any).purchase_uris,
      released_at: (card as any).released_at || "",
      lang: (card as any).lang || "en",
    }));

    // Cache the result
    printingsCache.set(cacheKey, { data: printings, timestamp: Date.now() });
    
    return printings;
  } catch (error) {
    console.error("Failed to fetch printings:", error);
    return [];
  }
}

/**
 * Generate a TCGPlayer purchase URL for a card.
 * Uses the card's embedded purchase URI if available, otherwise falls back to search.
 * @param card - The card to generate a URL for
 * @returns TCGPlayer URL for purchasing the card
 */
export function getTCGPlayerUrl(card: ScryfallCard): string {
  const purchaseUris = (card as any).purchase_uris;
  if (purchaseUris?.tcgplayer) {
    return purchaseUris.tcgplayer;
  }
  // Fallback to search
  return `https://www.tcgplayer.com/search/magic/product?productLineName=magic&q=${encodeURIComponent(card.name)}`;
}

/**
 * Generate a Cardmarket purchase URL for a card.
 * Uses the card's embedded purchase URI if available, otherwise falls back to search.
 * @param card - The card to generate a URL for
 * @returns Cardmarket URL for purchasing the card
 */
export function getCardmarketUrl(card: ScryfallCard): string {
  const purchaseUris = (card as any).purchase_uris;
  if (purchaseUris?.cardmarket) {
    return purchaseUris.cardmarket;
  }
  // Fallback to search
  return `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(card.name)}`;
}
