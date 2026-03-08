import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildCacheKey, loadCachedCritique, saveCritique } from '../critique-cache';
import type { DeckCard } from '@/hooks/useDeck';
import { createTestCard, createMockCritiqueResult } from '@/test/factories';

describe('critique-cache', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('buildCacheKey', () => {
    it('generates a consistent key for the same input', () => {
      const deckId = 'deck-123';
      const cards: DeckCard[] = [
        createTestCard({ card_name: 'Counterspell', quantity: 2, category: 'Control' }),
        createTestCard({ card_name: 'Island', quantity: 4, category: 'Land' }),
      ];

      const key1 = buildCacheKey(deckId, cards);
      const key2 = buildCacheKey(deckId, cards);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^offmeta_critique_deck-123_\d+$/);
    });

    it('produces different keys for different card lists', () => {
      const deckId = 'deck-123';
      const cards1: DeckCard[] = [
        createTestCard({ card_name: 'Counterspell', quantity: 2, category: 'Control' }),
      ];
      const cards2: DeckCard[] = [
        createTestCard({ card_name: 'Lightning Bolt', quantity: 3, category: 'Removal' }),
      ];

      const key1 = buildCacheKey(deckId, cards1);
      const key2 = buildCacheKey(deckId, cards2);

      expect(key1).not.toBe(key2);
    });

    it('produces different keys for different deck IDs', () => {
      const cards: DeckCard[] = [
        createTestCard({ card_name: 'Counterspell', quantity: 2, category: 'Control' }),
      ];

      const key1 = buildCacheKey('deck-1', cards);
      const key2 = buildCacheKey('deck-2', cards);

      expect(key1).not.toBe(key2);
    });

    it('produces the same key regardless of input order', () => {
      const deckId = 'deck-123';
      const cards: DeckCard[] = [
        createTestCard({ card_name: 'Counterspell', quantity: 2, category: 'Control' }),
        createTestCard({ card_name: 'Island', quantity: 4, category: 'Land' }),
      ];
      const cardsReordered: DeckCard[] = [
        createTestCard({ card_name: 'Island', quantity: 4, category: 'Land' }),
        createTestCard({ card_name: 'Counterspell', quantity: 2, category: 'Control' }),
      ];

      const key1 = buildCacheKey(deckId, cards);
      const key2 = buildCacheKey(deckId, cardsReordered);

      expect(key1).toBe(key2);
    });

    it('handles empty card list', () => {
      const key = buildCacheKey('deck-123', []);
      expect(key).toMatch(/^offmeta_critique_deck-123_\d+$/);
    });
  });

  describe('saveCritique', () => {
    it('saves critique data to sessionStorage', () => {
      const key = 'test-key';
      const critique = createMockCritiqueResult({
        cuts: [{ card_name: 'Bad Card', reason: 'Off-strategy', severity: 'weak' }],
        additions: [{ card_name: 'Good Card', reason: 'Fits archetype', category: 'Ramp' }],
        confidence: 0.75,
      });

      saveCritique(key, critique);

      const stored = sessionStorage.getItem(key);
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(critique);
    });

    it('overwrites existing critiques with the same key', () => {
      const key = 'test-key';
      const critique1 = createMockCritiqueResult({ summary: 'First', confidence: 0.5 });
      const critique2 = createMockCritiqueResult({ summary: 'Second', confidence: 0.8 });

      saveCritique(key, critique1);
      saveCritique(key, critique2);

      const stored = JSON.parse(sessionStorage.getItem(key)!);
      expect(stored.summary).toBe('Second');
      expect(stored.confidence).toBe(0.8);
    });

    it('gracefully handles sessionStorage quota exceeded', () => {
      const key = 'test-key';
      const critique = createMockCritiqueResult();

      // Mock sessionStorage.setItem to throw
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      // Should not throw
      expect(() => saveCritique(key, critique)).not.toThrow();

      setItemSpy.mockRestore();
    });

    it('gracefully handles other sessionStorage errors', () => {
      const key = 'test-key';
      const critique = createMockCritiqueResult();

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });

      expect(() => saveCritique(key, critique)).not.toThrow();

      setItemSpy.mockRestore();
    });
  });

  describe('loadCachedCritique', () => {
    it('loads valid critique data from sessionStorage', () => {
      const key = 'test-key';
      const critique = createMockCritiqueResult({
        cuts: [{ card_name: 'Bad Card', reason: 'Off-strategy', severity: 'off-strategy' }],
        additions: [
          {
            card_name: 'Good Card',
            reason: 'Fits archetype',
            category: 'Ramp',
            replaces: 'Bad Ramp',
          },
        ],
        confidence: 0.65,
        mana_curve_notes: 'Heavy on 3-drops',
      });

      sessionStorage.setItem(key, JSON.stringify(critique));

      const loaded = loadCachedCritique(key);
      expect(loaded).toEqual(critique);
    });

    it('returns null for non-existent keys', () => {
      const loaded = loadCachedCritique('non-existent-key');
      expect(loaded).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      const key = 'test-key';
      sessionStorage.setItem(key, 'not valid json {{{');

      const loaded = loadCachedCritique(key);
      expect(loaded).toBeNull();
    });

    it('returns null on sessionStorage read error', () => {
      const key = 'test-key';
      sessionStorage.setItem(key, JSON.stringify({ summary: 'test', cuts: [], additions: [] }));

      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });

      const loaded = loadCachedCritique(key);
      expect(loaded).toBeNull();

      getItemSpy.mockRestore();
    });
  });

  describe('round-trip: save and load', () => {
    it('loads the same data that was saved', () => {
      const key = buildCacheKey('deck-123', [
        createTestCard({ card_name: 'Card1', quantity: 1, category: 'Cat1' }),
      ]);
      const original = createMockCritiqueResult({
        summary: 'Comprehensive feedback',
        cuts: [
          { card_name: 'Weak Spell', reason: 'Does not advance win condition', severity: 'weak' },
          { card_name: 'Bad Ramp', reason: 'Too slow', severity: 'underperforming' },
        ],
        additions: [
          {
            card_name: 'Optimal Spell',
            reason: 'Synergizes with commander',
            category: 'Synergy',
            replaces: 'Weak Spell',
          },
        ],
        confidence: 0.82,
        mana_curve_notes: 'Good distribution across curve',
      });

      saveCritique(key, original);
      const loaded = loadCachedCritique(key);

      expect(loaded).toEqual(original);
    });

    it('preserves all critique fields after round-trip', () => {
      const key = 'test-key';
      const critique = createMockCritiqueResult({
        cuts: [
          { card_name: 'Cut1', reason: 'Reason1', severity: 'weak' },
          { card_name: 'Cut2', reason: 'Reason2', severity: 'underperforming' },
          { card_name: 'Cut3', reason: 'Reason3', severity: 'off-strategy' },
        ],
        additions: [
          { card_name: 'Add1', reason: 'Reason1', category: 'Cat1' },
          { card_name: 'Add2', reason: 'Reason2', category: 'Cat2', replaces: 'Cut1' },
        ],
        confidence: 0.42,
        mana_curve_notes: 'Curve is unbalanced',
      });

      saveCritique(key, critique);
      const loaded = loadCachedCritique(key)!;

      expect(loaded.summary).toBe(critique.summary);
      expect(loaded.cuts).toHaveLength(3);
      expect(loaded.additions).toHaveLength(2);
      expect(loaded.confidence).toBe(critique.confidence);
      expect(loaded.mana_curve_notes).toBe(critique.mana_curve_notes);
      expect(loaded.additions[1].replaces).toBe('Cut1');
    });
  });
});
