/**
 * Client-side filter state applied on top of Scryfall search results.
 * Managed by the SearchFilters component and synced to URL params.
 * @module types/filters
 */

export interface FilterState {
  /** Selected color codes (e.g., ["W", "U", "B"]) */
  colors: string[];
  /** Selected card types (e.g., ["creature", "instant"]) */
  types: string[];
  /** Converted mana cost range [min, max]; default [0, 16] */
  cmcRange: [number, number];
  /** Sort order key (e.g., "name-asc", "price-desc", "cmc-asc") */
  sortBy: string;
}
