/**
 * Shared test factories for creating mock data objects.
 * @module test/factories
 */

import type { ScryfallCard } from '@/types/card';
import { type TranslationResult } from '@/hooks';
import type { FilterState } from '@/types/filters';
import type { SearchIntent } from '@/types/search';

/**
 * Create a structurally valid ScryfallCard with sensible defaults.
 * Override any field via the `overrides` parameter.
 */
export function createMockCard(
  overrides?: Partial<ScryfallCard>,
): ScryfallCard {
  return {
    id: overrides?.id ?? `mock-${Math.random().toString(36).slice(2, 9)}`,
    name: 'Mock Card',
    cmc: 2,
    type_line: 'Creature — Human',
    color_identity: ['W'],
    set: 'tst',
    set_name: 'Test Set',
    rarity: 'common',
    prices: {},
    legalities: { standard: 'legal', commander: 'legal' },
    scryfall_uri: 'https://scryfall.com/card/tst/1/mock-card',
    image_uris: {
      small: 'https://example.com/small.jpg',
      normal: 'https://example.com/normal.jpg',
      large: 'https://example.com/large.jpg',
      png: 'https://example.com/card.png',
      art_crop: 'https://example.com/art.jpg',
      border_crop: 'https://example.com/border.jpg',
    },
    ...overrides,
  };
}

/**
 * Create a mock TranslationResult for search handler tests.
 */
export function createMockTranslation(
  overrides?: Partial<TranslationResult>,
): TranslationResult {
  return {
    scryfallQuery: 't:creature',
    explanation: {
      readable: 'Search for creatures',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: false,
    source: 'deterministic',
    ...overrides,
  };
}

/**
 * Create a valid FilterState object for filter tests.
 * Override any field via the `overrides` parameter.
 */
export function createMockFilterState(
  overrides?: Partial<FilterState>,
): FilterState {
  return {
    colors: [],
    types: [],
    cmcRange: [0, 16],
    sortBy: 'relevance-desc',
    ownedOnly: false,
    ...overrides,
  };
}

/**
 * Create a valid SearchIntent object for search translation tests.
 * Override any field via the `overrides` parameter.
 */
export function createMockSearchIntent(
  overrides?: Partial<SearchIntent>,
): SearchIntent {
  return {
    colors: null,
    types: [],
    cmc: null,
    power: null,
    toughness: null,
    tags: [],
    oraclePatterns: [],
    warnings: [],
    ...overrides,
  };
}
