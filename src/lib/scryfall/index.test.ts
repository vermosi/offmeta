/**
 * Tests for Scryfall module exports.
 * @module lib/scryfall/index.test
 */

import { describe, it, expect } from 'vitest';
import {
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
  getCardPrintings,
  getTCGPlayerUrl,
  getCardmarketUrl,
  VALID_SEARCH_KEYS,
  KNOWN_OTAGS,
  normalizeOrGroups,
  validateScryfallQuery,
  buildFilterQuery,
} from './index';

describe('lib/scryfall exports', () => {
  describe('client exports', () => {
    it('exports searchCards', () => {
      expect(typeof searchCards).toBe('function');
    });

    it('exports autocomplete', () => {
      expect(typeof autocomplete).toBe('function');
    });

    it('exports getRandomCard', () => {
      expect(typeof getRandomCard).toBe('function');
    });

    it('exports getCardByName', () => {
      expect(typeof getCardByName).toBe('function');
    });

    it('exports getCardImage', () => {
      expect(typeof getCardImage).toBe('function');
    });

    it('exports isDoubleFacedCard', () => {
      expect(typeof isDoubleFacedCard).toBe('function');
    });

    it('exports getCardFaceDetails', () => {
      expect(typeof getCardFaceDetails).toBe('function');
    });

    it('exports getRarityColor', () => {
      expect(typeof getRarityColor).toBe('function');
    });

    it('exports formatManaSymbols', () => {
      expect(typeof formatManaSymbols).toBe('function');
    });

    it('exports getCardRulings', () => {
      expect(typeof getCardRulings).toBe('function');
    });
  });

  describe('printings exports', () => {
    it('exports getCardPrintings', () => {
      expect(typeof getCardPrintings).toBe('function');
    });

    it('exports getTCGPlayerUrl', () => {
      expect(typeof getTCGPlayerUrl).toBe('function');
    });

    it('exports getCardmarketUrl', () => {
      expect(typeof getCardmarketUrl).toBe('function');
    });
  });

  describe('query exports', () => {
    it('exports VALID_SEARCH_KEYS', () => {
      expect(VALID_SEARCH_KEYS instanceof Set).toBe(true);
      expect(VALID_SEARCH_KEYS.size).toBeGreaterThan(0);
    });

    it('exports KNOWN_OTAGS', () => {
      expect(KNOWN_OTAGS instanceof Set).toBe(true);
      expect(KNOWN_OTAGS.size).toBeGreaterThan(0);
    });

    it('exports normalizeOrGroups', () => {
      expect(typeof normalizeOrGroups).toBe('function');
    });

    it('exports validateScryfallQuery', () => {
      expect(typeof validateScryfallQuery).toBe('function');
    });

    it('exports buildFilterQuery', () => {
      expect(typeof buildFilterQuery).toBe('function');
    });
  });
});
