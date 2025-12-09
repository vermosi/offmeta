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

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  return fetch(url);
}

export async function getCardPrintings(cardName: string): Promise<CardPrinting[]> {
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
    
    return data.data.map((card) => ({
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
  } catch (error) {
    console.error("Failed to fetch printings:", error);
    return [];
  }
}

export function getTCGPlayerUrl(card: ScryfallCard): string {
  const purchaseUris = (card as any).purchase_uris;
  if (purchaseUris?.tcgplayer) {
    return purchaseUris.tcgplayer;
  }
  // Fallback to search
  return `https://www.tcgplayer.com/search/magic/product?productLineName=magic&q=${encodeURIComponent(card.name)}`;
}

export function getCardmarketUrl(card: ScryfallCard): string {
  const purchaseUris = (card as any).purchase_uris;
  if (purchaseUris?.cardmarket) {
    return purchaseUris.cardmarket;
  }
  // Fallback to search
  return `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(card.name)}`;
}
