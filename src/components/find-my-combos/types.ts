export interface ComboCard {
  name: string;
  imageUrl?: string;
  typeLine?: string;
}

export interface Combo {
  id: string;
  cards: ComboCard[];
  description: string;
  prerequisites: string;
  produces: string[];
  identity: string;
  popularity: number;
  prices?: {
    tcgplayer?: string;
    cardmarket?: string;
    cardkingdom?: string;
  };
}

export interface ComboResults {
  identity: string;
  included: Combo[];
  almostIncluded: Combo[];
  totalIncluded: number;
  totalAlmostIncluded: number;
}
