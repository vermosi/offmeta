/**
 * Scryfall API client for Magic: The Gathering card data.
 * Handles rate limiting, search, and card image retrieval.
 * @module lib/scryfall
 */

import { ScryfallCard, SearchResult, AutocompleteResult } from "@/types/card";

const BASE_URL = "https://api.scryfall.com";

// Rate limiting: Scryfall asks for 50-100ms between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100;

/**
 * Fetch wrapper that enforces Scryfall's rate limiting requirements.
 * Ensures at least 100ms between consecutive API requests.
 * @param url - The URL to fetch
 * @returns The fetch Response
 */
async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }
  
  lastRequestTime = Date.now();
  return fetch(url);
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

/**
 * Get card name suggestions for autocomplete.
 * @param query - Partial card name (minimum 2 characters)
 * @returns Array of matching card names
 */
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

/**
 * Fetch a random Magic card from Scryfall.
 * @returns A random ScryfallCard
 */
export async function getRandomCard(): Promise<ScryfallCard> {
  const response = await rateLimitedFetch(`${BASE_URL}/cards/random`);
  
  if (!response.ok) {
    throw new Error(`Failed to get random card: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Fetch a specific card by its exact name.
 * @param name - The exact card name to look up
 * @returns The matching ScryfallCard
 * @throws Error if card is not found
 */
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

/**
 * Get the image URL for a card at the specified size.
 * Handles both single-faced and double-faced cards.
 * @param card - The card to get the image for
 * @param size - Image size: "small" (146px), "normal" (488px), or "large" (672px)
 * @param faceIndex - For multi-faced cards, which face to show (0 = front, 1 = back)
 * @returns The image URL, or placeholder if no image available
 */
export function getCardImage(card: ScryfallCard, size: "small" | "normal" | "large" = "normal", faceIndex: number = 0): string {
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
  
  return "/placeholder.svg";
}

/**
 * Check if a card is double-faced (transform, modal, etc.)
 * @param card - The card to check
 * @returns True if the card has multiple faces with separate images
 */
export function isDoubleFacedCard(card: ScryfallCard): boolean {
  return !!(card.card_faces && card.card_faces.length > 1 && card.card_faces[0]?.image_uris);
}

/**
 * Get the details for a specific face of a card
 * @param card - The card
 * @param faceIndex - Which face (0 = front, 1 = back)
 * @returns The face data or the card itself if single-faced
 */
export function getCardFaceDetails(card: ScryfallCard, faceIndex: number = 0) {
  if (card.card_faces && card.card_faces[faceIndex]) {
    const face = card.card_faces[faceIndex];
    return {
      name: face.name,
      mana_cost: face.mana_cost,
      type_line: face.type_line,
      oracle_text: face.oracle_text,
      power: face.power,
      toughness: face.toughness,
      flavor_text: face.flavor_text,
    };
  }
  
  return {
    name: card.name,
    mana_cost: card.mana_cost,
    type_line: card.type_line,
    oracle_text: card.oracle_text,
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
    case "mythic": return "text-orange-400";
    case "rare": return "text-gold";
    case "uncommon": return "text-slate-300";
    default: return "text-muted-foreground";
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
  return symbols.map(s => s.replace(/[{}]/g, ""));
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
const rulingsCache = new Map<string, { data: CardRuling[]; timestamp: number }>();
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
      `${BASE_URL}/cards/${cardId}/rulings`
    );
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    const rulings: CardRuling[] = data.data || [];
    
    rulingsCache.set(cardId, { data: rulings, timestamp: Date.now() });
    
    return rulings;
  } catch (error) {
    console.error("Failed to fetch rulings:", error);
    return [];
  }
}
