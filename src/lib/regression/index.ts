/**
 * Regression test utilities and shared helpers.
 * Exports mock data builders and common test setup functions.
 */

import { vi } from 'vitest';
import type { ScryfallCard } from '@/types/card';

// Re-export security test utilities for CI integration
export * from '@/lib/security';

/**
 * Build a minimal mock Scryfall card for testing
 */
export function buildMockCard(
  overrides: Partial<ScryfallCard> = {},
): ScryfallCard {
  return {
    id: `card-${Math.random().toString(36).substring(2, 9)}`,
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
    image_uris: {
      small: 'https://example.com/small.jpg',
      normal: 'https://example.com/normal.jpg',
      large: 'https://example.com/large.jpg',
      png: 'https://example.com/png.png',
      art_crop: 'https://example.com/art.jpg',
      border_crop: 'https://example.com/border.jpg',
    },
    legalities: {
      standard: 'legal',
      pioneer: 'legal',
      modern: 'legal',
      legacy: 'legal',
      vintage: 'legal',
      commander: 'legal',
      pauper: 'legal',
      brawl: 'legal',
      historic: 'legal',
      explorer: 'legal',
      alchemy: 'legal',
      penny: 'legal',
      duel: 'legal',
      oathbreaker: 'legal',
      timeless: 'legal',
      paupercommander: 'legal',
      premodern: 'not_legal',
      predh: 'not_legal',
      standardbrawl: 'not_legal',
      oldschool: 'not_legal',
    },
    prices: {
      usd: '0.25',
      usd_foil: '0.50',
      eur: '0.20',
      tix: '0.01',
    },
    scryfall_uri: 'https://scryfall.com/card/tst/1',
    ...overrides,
  };
}

/**
 * Build an array of mock cards
 */
export function buildMockCards(count: number): ScryfallCard[] {
  return Array.from({ length: count }, (_, i) =>
    buildMockCard({
      id: `card-${i}`,
      name: `Test Card ${i + 1}`,
    }),
  );
}

/**
 * Mock semantic search response structure
 */
export interface MockSemanticSearchResponse {
  originalQuery: string;
  scryfallQuery: string;
  explanation: {
    readable: string;
    assumptions: string[];
    confidence: number;
  };
  success: boolean;
  source: 'deterministic' | 'llm' | 'cache';
}

/**
 * Build a mock semantic search response
 */
export function buildMockSemanticSearchResponse(
  query: string,
  scryfallQuery: string = 't:creature',
  options: Partial<MockSemanticSearchResponse> = {},
): MockSemanticSearchResponse {
  return {
    originalQuery: query,
    scryfallQuery,
    explanation: {
      readable: 'Test explanation',
      assumptions: [],
      confidence: 0.9,
    },
    success: true,
    source: 'deterministic',
    ...options,
  };
}

/**
 * Test case interface for NL translation tests
 */
export interface NLTranslationTestCase {
  input: string;
  contains: string[];
  notContains?: string[];
  description?: string;
}

/**
 * Test case interface for validation tests
 */
export interface ValidationTestCase {
  input: string;
  expectedValid: boolean;
  expectedReason?: string;
  expectedSanitized?: string;
  description?: string;
}

/**
 * Shared test timeout for async operations
 */
export const TEST_TIMEOUT = 10000;

/**
 * Mock IntersectionObserver for virtualization tests
 */
export function mockIntersectionObserver(): void {
  const mockObserver = vi.fn();
  mockObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.IntersectionObserver = mockObserver;
}

/**
 * Mock ResizeObserver for virtualization tests
 */
export function mockResizeObserver(): void {
  const mockObserver = vi.fn();
  mockObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.ResizeObserver = mockObserver;
}

/**
 * Setup all browser mocks needed for component testing
 */
export function setupBrowserMocks(): void {
  mockIntersectionObserver();
  mockResizeObserver();
}
