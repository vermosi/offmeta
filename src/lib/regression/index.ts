/**
 * Shared helpers and fixtures for the regression test suite.
 * @module lib/regression
 */

import { vi } from 'vitest';

import type { ScryfallCard } from '@/types/card';

/** Default timeout for regression tests (ms). */
export const TEST_TIMEOUT = 10000;

export interface NLTranslationTestCase {
  /** Natural-language input. */
  input: string;
  /** Fragments expected to appear in the translated query. */
  contains: string[];
  /** Fragments that must not appear in the translated query. */
  notContains?: string[];
  /** Human-readable description of the assertion. */
  description: string;
}

export interface ValidationTestCase {
  /** Raw Scryfall query input. */
  input: string;
  /** Whether the query is expected to validate. */
  expectedValid: boolean;
  /** Expected failure reason fragment. */
  expectedReason?: string;
  /** Expected sanitized output. */
  expectedSanitized?: string;
  /** Human-readable description of the assertion. */
  description: string;
}

export type MockCard = ScryfallCard;

let cardCounter = 0;

/** Builds a deterministic mock Scryfall-like card, with optional overrides. */
export function buildMockCard(overrides: Partial<MockCard> = {}): MockCard {
  cardCounter += 1;
  return {
    id: `mock-card-${cardCounter}-${Math.random().toString(36).slice(2, 8)}`,
    oracle_id: `mock-oracle-${cardCounter}`,
    name: 'Test Card',
    mana_cost: '{2}{U}',
    cmc: 3,
    type_line: 'Creature — Test',
    oracle_text: 'This is a test card.',
    colors: ['U'],
    color_identity: ['U'],
    set: 'TST',
    set_name: 'Test Set',
    rarity: 'common',
    scryfall_uri: 'https://scryfall.com/card/tst/1/test-card',
    image_uris: {
      small: 'https://example.com/small.jpg',
      normal: 'https://example.com/normal.jpg',
      large: 'https://example.com/large.jpg',
      png: 'https://example.com/card.png',
      art_crop: 'https://example.com/art_crop.jpg',
      border_crop: 'https://example.com/border_crop.jpg',
    },
    legalities: {
      commander: 'legal',
      modern: 'legal',
      standard: 'not_legal',
    },
    prices: {
      usd: '0.25',
      usd_foil: '1.00',
      eur: '0.20',
      tix: undefined,
    },
    ...overrides,
  };
}

/** Builds `count` sequentially named mock cards. */
export function buildMockCards(
  count: number,
  overrides: Partial<MockCard> = {},
): MockCard[] {
  return Array.from({ length: count }, (_, index) =>
    buildMockCard({ name: `Test Card ${index + 1}`, ...overrides }),
  );
}

export interface MockSemanticSearchResponse {
  success: boolean;
  originalQuery: string;
  scryfallQuery: string;
  source: string;
  explanation: {
    readable: string;
    assumptions: string[];
    confidence: number;
  };
}

/** Builds a mock semantic-search edge function response. */
export function buildMockSemanticSearchResponse(
  originalQuery: string,
  scryfallQuery: string,
  overrides: Partial<MockSemanticSearchResponse> = {},
): MockSemanticSearchResponse {
  return {
    success: true,
    originalQuery,
    scryfallQuery,
    source: 'deterministic',
    explanation: {
      readable: 'Test explanation',
      assumptions: [],
      confidence: 0.9,
    },
    ...overrides,
  };
}

/** Installs a no-op IntersectionObserver on window. */
export function mockIntersectionObserver(): void {
  const mock = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => []),
  }));
  vi.stubGlobal('IntersectionObserver', mock);
}

/** Installs a no-op ResizeObserver on window. */
export function mockResizeObserver(): void {
  const mock = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  vi.stubGlobal('ResizeObserver', mock);
}

/** Installs all browser observer mocks used by regression tests. */
export function setupBrowserMocks(): void {
  mockIntersectionObserver();
  mockResizeObserver();
}
