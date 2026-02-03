/**
 * Shared types for CardModal sub-components.
 * @module components/CardModal/types
 */

import type { ScryfallCard } from '@/types/card';
import type { CardPrinting } from '@/lib/card-printings';
import type { CardRuling } from '@/lib/scryfall';

export interface CardFaceDetails {
  name: string;
  mana_cost?: string;
  type_line: string;
  oracle_text?: string;
  flavor_text?: string;
  power?: string;
  toughness?: string;
}

export interface DisplayPrices {
  usd?: string;
  usd_foil?: string;
  eur?: string;
  eur_foil?: string;
}

export interface CardModalImageProps {
  displayImageUrl: string;
  cardName: string;
  isDoubleFaced: boolean;
  isFlipping: boolean;
  onTransform: () => void;
  isMobile?: boolean;
}

export interface CardModalDetailsProps {
  faceDetails: CardFaceDetails;
  displaySetName: string;
  displayRarity: string;
  displayCollectorNumber: string;
  displayArtist?: string;
  isReserved?: boolean;
  englishPrintings: CardPrinting[];
  selectedPrintingId?: string;
  cardId: string;
  isMobile?: boolean;
}

export interface CardModalPurchaseLinksProps {
  card: ScryfallCard;
  displayPrices: DisplayPrices;
  displayTix?: string;
  selectedPrinting: CardPrinting | null;
  isLoadingPrintings: boolean;
  onAffiliateClick: (
    marketplace:
      | 'tcgplayer'
      | 'cardmarket'
      | 'tcgplayer-foil'
      | 'cardmarket-foil'
      | 'cardhoarder',
    url: string,
    price?: string,
  ) => void;
  isMobile?: boolean;
}

export interface CardModalRulingsProps {
  rulings: CardRuling[];
  isLoading: boolean;
  showRulings: boolean;
  onToggleRulings: () => void;
}

export interface CardModalLegalitiesProps {
  legalities: Record<string, string>;
  isMobile?: boolean;
}

export interface CardModalPrintingsProps {
  printings: CardPrinting[];
  isLoading: boolean;
  selectedPrintingId?: string;
  cardId: string;
  onSelectPrinting: (printing: CardPrinting) => void;
  isMobile?: boolean;
}

export interface CardModalToolboxProps {
  cardName: string;
  scryfallUri: string;
  isMobile?: boolean;
}

// Format names that need special handling
export const FORMAT_DISPLAY_NAMES: Record<string, string> = {
  paupercommander: 'Pauper Commander',
  duel: 'Duel Commander',
  oldschool: 'Old School',
  premodern: 'Premodern',
  predh: 'PreDH',
  oathbreaker: 'Oathbreaker',
  gladiator: 'Gladiator',
  historicbrawl: 'Historic Brawl',
  standardbrawl: 'Standard Brawl',
  timeless: 'Timeless',
  explorer: 'Explorer',
  penny: 'Penny Dreadful',
};

export function formatFormatName(format: string): string {
  if (FORMAT_DISPLAY_NAMES[format]) {
    return FORMAT_DISPLAY_NAMES[format];
  }
  return format.charAt(0).toUpperCase() + format.slice(1);
}
