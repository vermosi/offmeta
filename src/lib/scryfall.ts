import { ScryfallCard, SearchResult, AutocompleteResult } from "@/types/card";

const BASE_URL = "https://api.scryfall.com";

// Rate limiting: Scryfall asks for 50-100ms between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }
  
  lastRequestTime = Date.now();
  return fetch(url);
}

export async function searchCards(query: string, page: number = 1): Promise<SearchResult> {
  const encodedQuery = encodeURIComponent(query);
  const response = await rateLimitedFetch(
    `${BASE_URL}/cards/search?q=${encodedQuery}&page=${page}`
  );
  
  if (!response.ok) {
    if (response.status === 404) {
      return { object: "list", total_cards: 0, has_more: false, data: [] };
    }
    throw new Error(`Search failed: ${response.statusText}`);
  }
  
  return response.json();
}

export async function autocomplete(query: string): Promise<string[]> {
  if (query.length < 2) return [];
  
  const encodedQuery = encodeURIComponent(query);
  const response = await rateLimitedFetch(
    `${BASE_URL}/cards/autocomplete?q=${encodedQuery}`
  );
  
  if (!response.ok) return [];
  
  const data: AutocompleteResult = await response.json();
  return data.data;
}

export async function getRandomCard(): Promise<ScryfallCard> {
  const response = await rateLimitedFetch(`${BASE_URL}/cards/random`);
  
  if (!response.ok) {
    throw new Error(`Failed to get random card: ${response.statusText}`);
  }
  
  return response.json();
}

export async function getCardByName(name: string): Promise<ScryfallCard> {
  const encodedName = encodeURIComponent(name);
  const response = await rateLimitedFetch(
    `${BASE_URL}/cards/named?exact=${encodedName}`
  );
  
  if (!response.ok) {
    throw new Error(`Card not found: ${name}`);
  }
  
  return response.json();
}

export function getCardImage(card: ScryfallCard, size: "small" | "normal" | "large" = "normal"): string {
  if (card.image_uris) {
    return card.image_uris[size];
  }
  
  if (card.card_faces && card.card_faces[0]?.image_uris) {
    return card.card_faces[0].image_uris[size];
  }
  
  return "/placeholder.svg";
}

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case "mythic": return "text-orange-400";
    case "rare": return "text-gold";
    case "uncommon": return "text-slate-300";
    default: return "text-muted-foreground";
  }
}

export function formatManaSymbols(manaCost: string): string[] {
  if (!manaCost) return [];
  const symbols = manaCost.match(/\{[^}]+\}/g) || [];
  return symbols.map(s => s.replace(/[{}]/g, ""));
}
