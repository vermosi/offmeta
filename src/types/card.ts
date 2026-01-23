/**
 * TypeScript interfaces for Scryfall API card data.
 * @see https://scryfall.com/docs/api/cards
 * @module types/card
 */

/**
 * Represents a Magic: The Gathering card from the Scryfall API.
 * Contains all relevant card data including images, prices, and legality.
 */
export interface ScryfallCard {
  /** Unique Scryfall identifier for this card */
  id: string;

  /** The card's English name */
  name: string;

  /** The mana cost in Scryfall notation (e.g., "{2}{W}{U}") */
  mana_cost?: string;

  /** Converted mana cost / mana value as a number */
  cmc: number;

  /** The full type line (e.g., "Legendary Creature — Human Wizard") */
  type_line: string;

  /** The card's rules text / oracle text */
  oracle_text?: string;

  /** Collector number within the set */
  collector_number?: string;

  /** Power value for creatures (can be "*" or number as string) */
  power?: string;

  /** Toughness value for creatures (can be "*" or number as string) */
  toughness?: string;

  /** Array of colors in the card's mana cost: ["W", "U", "B", "R", "G"] */
  colors?: string[];

  /** Color identity for Commander format (includes text box colors) */
  color_identity: string[];

  /** Three-letter set code (e.g., "MID", "VOW", "NEO") */
  set: string;

  /** Full set name (e.g., "Innistrad: Midnight Hunt") */
  set_name: string;

  /** Card rarity: "common", "uncommon", "rare", "mythic", "special", "bonus" */
  rarity: string;

  /**
   * Image URLs at various sizes.
   * Not present on double-faced cards - check card_faces instead.
   */
  image_uris?: {
    /** 146×204 JPG for list views */
    small: string;
    /** 488×680 JPG for standard display */
    normal: string;
    /** 672×936 JPG for detailed views */
    large: string;
    /** 745×1040 PNG with transparency */
    png: string;
    /** Square crop of just the art */
    art_crop: string;
    /** Full card with minimal border */
    border_crop: string;
  };

  /**
   * Array of card faces for double-faced / split cards.
   * Each face has its own name, mana cost, type line, etc.
   */
  card_faces?: {
    /** Face name (e.g., "Delver of Secrets") */
    name: string;
    /** Mana cost for this face */
    mana_cost?: string;
    /** Type line for this face */
    type_line: string;
    /** Oracle text for this face */
    oracle_text?: string;
    /** Power if this face is a creature */
    power?: string;
    /** Toughness if this face is a creature */
    toughness?: string;
    /** Flavor text for this face */
    flavor_text?: string;
    /** Color indicator for faces without mana cost */
    color_indicator?: string[];
    /** Image URLs for this specific face */
    image_uris?: {
      small: string;
      normal: string;
      large: string;
      png: string;
      art_crop: string;
      border_crop: string;
    };
  }[];

  /**
   * Current market prices in various currencies.
   * Values are strings (e.g., "12.50") or undefined if unavailable.
   */
  prices: {
    /** USD price for non-foil */
    usd?: string;
    /** USD price for foil */
    usd_foil?: string;
    /** EUR price for non-foil */
    eur?: string;
    /** EUR price for foil */
    eur_foil?: string;
    /** MTGO tix price */
    tix?: string;
  };

  /**
   * Format legality map.
   * Keys are format names, values are "legal", "not_legal", "banned", or "restricted".
   * @example { standard: "legal", modern: "legal", commander: "banned" }
   */
  legalities: Record<string, string>;

  /** Artist name for this printing */
  artist?: string;

  /** Italic flavor text on the card */
  flavor_text?: string;

  /** URL to this card's page on Scryfall */
  scryfall_uri: string;

  /** Purchase links from Scryfall */
  purchase_uris?: {
    tcgplayer?: string;
    cardmarket?: string;
    cardhoarder?: string;
  };

  /** Release date for this printing */
  released_at?: string;

  /** Language code for this printing */
  lang?: string;

  /** Reserved list indicator */
  reserved?: boolean;
}

/**
 * Response from Scryfall search endpoint.
 * Contains paginated card results.
 */
export interface SearchResult {
  /** Always "list" for search results */
  object: string;

  /** Total number of cards matching the query across all pages */
  total_cards: number;

  /** Whether there are more pages of results */
  has_more: boolean;

  /** URL to fetch the next page (if has_more is true) */
  next_page?: string;

  /** Array of cards on this page (up to 175 per page) */
  data: ScryfallCard[];
}

/**
 * Response from Scryfall autocomplete endpoint.
 * Returns matching card names for typeahead suggestions.
 */
export interface AutocompleteResult {
  /** Always "catalog" for autocomplete results */
  object: string;

  /** Number of matching names */
  total_values: number;

  /** Array of card names matching the query (up to 20) */
  data: string[];
}
