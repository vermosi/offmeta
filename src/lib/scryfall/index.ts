/**
 * Scryfall API integration.
 * @module lib/scryfall
 */

export {
  searchCards,
  autocomplete,
  getRandomCard,
  getCardByName,
  getCardImage,
  isDoubleFacedCard,
  getCardFaceDetails,
  getRarityColor,
  formatManaSymbols,
  getCardRulings,
  type CardRuling,
} from './client';

export {
  getCardPrintings,
  getTCGPlayerUrl,
  getCardmarketUrl,
  type CardPrinting,
  type PrintingsResult,
} from './printings';

export {
  VALID_SEARCH_KEYS,
  KNOWN_OTAGS,
  normalizeOrGroups,
  validateScryfallQuery,
  buildFilterQuery,
} from './query';
