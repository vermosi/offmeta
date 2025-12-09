export interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  colors?: string[];
  color_identity: string[];
  set: string;
  set_name: string;
  rarity: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
  card_faces?: {
    name: string;
    mana_cost?: string;
    type_line: string;
    oracle_text?: string;
    power?: string;
    toughness?: string;
    image_uris?: {
      small: string;
      normal: string;
      large: string;
      png: string;
      art_crop: string;
      border_crop: string;
    };
  }[];
  prices: {
    usd?: string;
    usd_foil?: string;
    eur?: string;
  };
  legalities: Record<string, string>;
  artist?: string;
  flavor_text?: string;
  scryfall_uri: string;
}

export interface SearchResult {
  object: string;
  total_cards: number;
  has_more: boolean;
  next_page?: string;
  data: ScryfallCard[];
}

export interface AutocompleteResult {
  object: string;
  total_values: number;
  data: string[];
}
