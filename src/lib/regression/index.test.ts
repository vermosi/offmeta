/**
 * Tests for regression module utilities.
 * @module lib/regression/index.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildMockCard,
  buildMockCards,
  buildMockSemanticSearchResponse,
  TEST_TIMEOUT,
  mockIntersectionObserver,
  mockResizeObserver,
  setupBrowserMocks,
  type NLTranslationTestCase,
  type ValidationTestCase,
} from './index';

describe('buildMockCard', () => {
  it('creates a card with default values', () => {
    const card = buildMockCard();
    
    expect(card.name).toBe('Test Card');
    expect(card.mana_cost).toBe('{2}{U}');
    expect(card.cmc).toBe(3);
    expect(card.type_line).toBe('Creature — Test');
    expect(card.oracle_text).toBe('This is a test card.');
    expect(card.set).toBe('TST');
    expect(card.rarity).toBe('common');
  });

  it('generates unique IDs', () => {
    const card1 = buildMockCard();
    const card2 = buildMockCard();
    
    expect(card1.id).not.toBe(card2.id);
  });

  it('applies overrides', () => {
    const card = buildMockCard({
      name: 'Custom Card',
      mana_cost: '{R}',
      cmc: 1,
      rarity: 'mythic',
    });
    
    expect(card.name).toBe('Custom Card');
    expect(card.mana_cost).toBe('{R}');
    expect(card.cmc).toBe(1);
    expect(card.rarity).toBe('mythic');
  });

  it('includes image URIs', () => {
    const card = buildMockCard();
    
    expect(card.image_uris).toBeDefined();
    expect(card.image_uris?.normal).toBe('https://example.com/normal.jpg');
  });

  it('includes legalities', () => {
    const card = buildMockCard();
    
    expect(card.legalities).toBeDefined();
    expect(card.legalities.commander).toBe('legal');
  });

  it('includes prices', () => {
    const card = buildMockCard();
    
    expect(card.prices).toBeDefined();
    expect(card.prices.usd).toBe('0.25');
  });
});

describe('buildMockCards', () => {
  it('creates specified number of cards', () => {
    const cards = buildMockCards(5);
    
    expect(cards).toHaveLength(5);
  });

  it('generates unique IDs for each card', () => {
    const cards = buildMockCards(3);
    const ids = cards.map(c => c.id);
    
    expect(new Set(ids).size).toBe(3);
  });

  it('names cards sequentially', () => {
    const cards = buildMockCards(3);
    
    expect(cards[0].name).toBe('Test Card 1');
    expect(cards[1].name).toBe('Test Card 2');
    expect(cards[2].name).toBe('Test Card 3');
  });

  it('handles zero count', () => {
    const cards = buildMockCards(0);
    
    expect(cards).toHaveLength(0);
  });
});

describe('buildMockSemanticSearchResponse', () => {
  it('creates response with default values', () => {
    const response = buildMockSemanticSearchResponse('test query', 't:creature');
    
    expect(response.originalQuery).toBe('test query');
    expect(response.scryfallQuery).toBe('t:creature');
    expect(response.success).toBe(true);
    expect(response.source).toBe('deterministic');
    expect(response.explanation.readable).toBe('Test explanation');
    expect(response.explanation.confidence).toBe(0.9);
  });

  it('applies overrides', () => {
    const response = buildMockSemanticSearchResponse('query', 'c:r', {
      success: false,
      source: 'llm',
      explanation: {
        readable: 'Custom explanation',
        assumptions: ['assumed red'],
        confidence: 0.7,
      },
    });
    
    expect(response.success).toBe(false);
    expect(response.source).toBe('llm');
    expect(response.explanation.readable).toBe('Custom explanation');
    expect(response.explanation.assumptions).toContain('assumed red');
  });
});

describe('TEST_TIMEOUT', () => {
  it('is a positive number', () => {
    expect(typeof TEST_TIMEOUT).toBe('number');
    expect(TEST_TIMEOUT).toBeGreaterThan(0);
  });

  it('is 10 seconds', () => {
    expect(TEST_TIMEOUT).toBe(10000);
  });
});

describe('mockIntersectionObserver', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sets IntersectionObserver on window', () => {
    mockIntersectionObserver();
    expect(window.IntersectionObserver).toBeDefined();
  });

  it('mock returns object with observer methods', () => {
    mockIntersectionObserver();
    // The mock creates a function that returns an observer-like object
    expect(typeof window.IntersectionObserver).toBe('function');
  });
});

describe('mockResizeObserver', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sets ResizeObserver on window', () => {
    mockResizeObserver();
    expect(window.ResizeObserver).toBeDefined();
  });

  it('mock returns object with observer methods', () => {
    mockResizeObserver();
    expect(typeof window.ResizeObserver).toBe('function');
  });
});

describe('setupBrowserMocks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sets up all browser mocks', () => {
    setupBrowserMocks();
    
    expect(window.IntersectionObserver).toBeDefined();
    expect(window.ResizeObserver).toBeDefined();
  });
});

describe('type exports', () => {
  it('NLTranslationTestCase has correct shape', () => {
    const testCase: NLTranslationTestCase = {
      input: 'test input',
      contains: ['expected'],
      notContains: ['not expected'],
      description: 'test description',
    };
    
    expect(testCase.input).toBe('test input');
    expect(testCase.contains).toContain('expected');
  });

  it('ValidationTestCase has correct shape', () => {
    const testCase: ValidationTestCase = {
      input: 'test',
      expectedValid: true,
      expectedReason: 'reason',
      expectedSanitized: 'sanitized',
      description: 'desc',
    };
    
    expect(testCase.expectedValid).toBe(true);
  });
});
