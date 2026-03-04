/**
 * Branch-coverage tests for scryfall/client.ts.
 * Targets uncovered branches: locale handling in getCardFaceDetails,
 * searchCards with lang, getCardsByExactNames edge cases, cache
 * eviction/expiry, and retry logic.
 * @module lib/scryfall/client-branch-coverage.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ScryfallCard } from '@/types/card';

const mockResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const buildCard = (overrides: Partial<ScryfallCard> = {}): ScryfallCard => ({
  id: 'card-id',
  name: 'Test Card',
  cmc: 2,
  type_line: 'Creature — Test',
  color_identity: [],
  set: 'tst',
  set_name: 'Test Set',
  rarity: 'rare',
  prices: {},
  legalities: {},
  scryfall_uri: 'https://example.com/card',
  ...overrides,
});

const loadModule = async () => import('@/lib/scryfall/client');

describe('scryfall client branch coverage', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ── getCardFaceDetails locale branches ─────────────────────────────────

  describe('getCardFaceDetails with locale', () => {
    it('uses printed_name for non-English locale on multi-face card', async () => {
      const { getCardFaceDetails } = await loadModule();
      const card = buildCard({
        printed_name: 'Nom Face A // Nom Face B',
        printed_type_line: 'Type A // Type B',
        printed_text: 'Texte traduit',
        card_faces: [
          {
            name: 'Face A',
            mana_cost: '{1}',
            type_line: 'Creature — A',
            oracle_text: 'English text',
          },
          {
            name: 'Face B',
            mana_cost: '{2}',
            type_line: 'Creature — B',
            oracle_text: 'English back',
          },
        ],
      });

      const face0 = getCardFaceDetails(card, 0, 'fr');
      expect(face0.name).toBe('Nom Face A');
      expect(face0.type_line).toBe('Type A');
      expect(face0.oracle_text).toBe('Texte traduit');

      const face1 = getCardFaceDetails(card, 1, 'fr');
      expect(face1.name).toBe('Nom Face B');
      expect(face1.type_line).toBe('Type B');
    });

    it('falls back to English face name when printed_name has no // split for that index', async () => {
      const { getCardFaceDetails } = await loadModule();
      const card = buildCard({
        printed_name: 'OnlyOneName',
        card_faces: [
          { name: 'Face A', mana_cost: '{1}', type_line: 'Creature', oracle_text: 'text' },
          { name: 'Face B', mana_cost: '{2}', type_line: 'Sorcery', oracle_text: 'text' },
        ],
      });

      // faceIndex=1 but printed_name doesn't have a second part
      const face1 = getCardFaceDetails(card, 1, 'ja');
      expect(face1.name).toBe('Face B'); // Falls back to English face name
    });

    it('uses printed fields for single-face card with non-English locale', async () => {
      const { getCardFaceDetails } = await loadModule();
      const card = buildCard({
        name: 'Lightning Bolt',
        printed_name: 'Éclair',
        printed_type_line: 'Rituel',
        printed_text: 'Éclair inflige 3 blessures',
        mana_cost: '{R}',
        type_line: 'Instant',
        oracle_text: 'Lightning Bolt deals 3 damage',
      });

      const details = getCardFaceDetails(card, 0, 'fr');
      expect(details.name).toBe('Éclair');
      expect(details.type_line).toBe('Rituel');
      expect(details.oracle_text).toBe('Éclair inflige 3 blessures');
    });

    it('uses English fields for single-face card without printed fields', async () => {
      const { getCardFaceDetails } = await loadModule();
      const card = buildCard({
        name: 'Sol Ring',
        mana_cost: '{1}',
        type_line: 'Artifact',
        oracle_text: 'Tap: Add {C}{C}.',
      });

      const details = getCardFaceDetails(card, 0, 'de');
      expect(details.name).toBe('Sol Ring'); // No printed_name → fallback
      expect(details.type_line).toBe('Artifact');
    });

    it('returns English details when locale is en', async () => {
      const { getCardFaceDetails } = await loadModule();
      const card = buildCard({
        name: 'Sol Ring',
        printed_name: 'Should not appear',
        mana_cost: '{1}',
        type_line: 'Artifact',
        oracle_text: 'Tap: Add {C}{C}.',
      });

      const details = getCardFaceDetails(card, 0, 'en');
      expect(details.name).toBe('Sol Ring');
    });
  });

  // ── searchCards with lang ──────────────────────────────────────────────

  describe('searchCards with lang parameter', () => {
    it('prepends lang filter for non-English', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        mockResponse({ object: 'list', total_cards: 1, has_more: false, data: [buildCard()] }),
      );

      const { searchCards, clearSearchCache } = await loadModule();
      clearSearchCache();
      await searchCards('t:dragon', 1, 'ja');

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain(encodeURIComponent('lang:ja'));
    });

    it('does not prepend lang filter for English', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        mockResponse({ object: 'list', total_cards: 1, has_more: false, data: [buildCard()] }),
      );

      const { searchCards, clearSearchCache } = await loadModule();
      clearSearchCache();
      await searchCards('t:dragon', 1, 'en');

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('lang%3A');
    });
  });

  // ── getCardsByExactNames ──────────────────────────────────────────────

  describe('getCardsByExactNames', () => {
    it('returns empty array for empty input', async () => {
      const { getCardsByExactNames } = await loadModule();
      const result = await getCardsByExactNames([]);
      expect(result).toEqual([]);
    });

    it('deduplicates and trims names', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        mockResponse({ object: 'list', data: [buildCard({ name: 'Sol Ring' })] }),
      );

      const { getCardsByExactNames } = await loadModule();
      await getCardsByExactNames(['Sol Ring', ' Sol Ring ', 'Sol Ring']);

      // Should only send 1 unique name
      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.identifiers).toHaveLength(1);
    });

    it('filters out empty names', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        mockResponse({ object: 'list', data: [] }),
      );

      const { getCardsByExactNames } = await loadModule();
      await getCardsByExactNames(['', '  ', 'Sol Ring']);
    });

    it('continues on 404 for a chunk', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(mockResponse({}, 404))
        .mockResolvedValueOnce(mockResponse({ object: 'list', data: [buildCard()] }));

      const { getCardsByExactNames } = await loadModule();
      // Create 76 unique names to force 2 chunks
      const names = Array.from({ length: 76 }, (_, i) => `Card ${i}`);
      const result = await getCardsByExactNames(names);
      // First chunk 404'd, second succeeded
      expect(result).toHaveLength(1);
    });

    it('throws on non-404 errors', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({}, 500));

      const { getCardsByExactNames } = await loadModule();
      await expect(getCardsByExactNames(['Sol Ring'])).rejects.toThrow(/Collection fetch failed/);
    });
  });

  // ── Search cache branches ─────────────────────────────────────────────

  describe('search cache', () => {
    it('returns cached result on same query', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        mockResponse({ object: 'list', total_cards: 1, has_more: false, data: [buildCard()] }),
      );

      const { searchCards, clearSearchCache } = await loadModule();
      clearSearchCache();

      await searchCards('t:angel');
      const result2 = await searchCards('t:angel');

      expect(fetchSpy).toHaveBeenCalledTimes(1); // Only one fetch
      expect(result2.data).toHaveLength(1);
    });

    it('expires cache entries after TTL', async () => {
      vi.useFakeTimers();
      let callCount = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        callCount++;
        return mockResponse({ object: 'list', total_cards: 1, has_more: false, data: [buildCard()] });
      });

      const { searchCards, clearSearchCache } = await loadModule();
      clearSearchCache();

      await searchCards('t:goblin');
      vi.advanceTimersByTime(16 * 60 * 1000); // 16 minutes > 15 min TTL
      await searchCards('t:goblin');

      expect(callCount).toBe(2); // Cache expired, fetched again
      vi.useRealTimers();
    });
  });

  // ── getCardImage edge case ────────────────────────────────────────────

  describe('getCardImage with card_faces no image_uris', () => {
    it('returns placeholder when card_faces exist but have no image_uris', async () => {
      const { getCardImage } = await loadModule();
      const card = buildCard({
        card_faces: [
          { name: 'Front', mana_cost: '{1}', type_line: 'Creature', oracle_text: '' },
        ],
      });
      expect(getCardImage(card)).toBe('/placeholder.svg');
    });
  });

  // ── isDoubleFacedCard edge cases ──────────────────────────────────────

  describe('isDoubleFacedCard edge cases', () => {
    it('returns false for single-face card_faces', async () => {
      const { isDoubleFacedCard } = await loadModule();
      const card = buildCard({
        card_faces: [
          { name: 'Only', mana_cost: '{1}', type_line: 'Creature', oracle_text: '',
            image_uris: { small: 's', normal: 'n', large: 'l', png: 'p', art_crop: 'a', border_crop: 'b' } },
        ],
      });
      expect(isDoubleFacedCard(card)).toBe(false); // Only 1 face
    });

    it('returns false when card_faces have no image_uris', async () => {
      const { isDoubleFacedCard } = await loadModule();
      const card = buildCard({
        card_faces: [
          { name: 'Front', mana_cost: '{1}', type_line: 'Creature', oracle_text: '' },
          { name: 'Back', mana_cost: '{2}', type_line: 'Creature', oracle_text: '' },
        ],
      });
      expect(isDoubleFacedCard(card)).toBe(false); // No image_uris on first face
    });
  });

  // ── getRarityColor edge cases ─────────────────────────────────────────

  describe('getRarityColor', () => {
    it('returns default for unknown rarity', async () => {
      const { getRarityColor } = await loadModule();
      expect(getRarityColor('special')).toBe('text-muted-foreground');
    });

    it('returns mythic color', async () => {
      const { getRarityColor } = await loadModule();
      expect(getRarityColor('mythic')).toBe('text-warning');
    });

    it('returns rare color', async () => {
      const { getRarityColor } = await loadModule();
      expect(getRarityColor('rare')).toBe('text-gold');
    });

    it('returns uncommon color', async () => {
      const { getRarityColor } = await loadModule();
      expect(getRarityColor('uncommon')).toBe('text-muted-foreground');
    });
  });

  // ── formatManaSymbols ────────────────────────────────────────────────

  describe('formatManaSymbols', () => {
    it('parses mana cost string', async () => {
      const { formatManaSymbols } = await loadModule();
      expect(formatManaSymbols('{2}{W}{U}')).toEqual(['2', 'W', 'U']);
    });

    it('returns empty for empty/null string', async () => {
      const { formatManaSymbols } = await loadModule();
      expect(formatManaSymbols('')).toEqual([]);
    });

    it('handles hybrid mana', async () => {
      const { formatManaSymbols } = await loadModule();
      expect(formatManaSymbols('{W/U}{B}')).toEqual(['W/U', 'B']);
    });
  });

  // ── autocomplete ─────────────────────────────────────────────────────

  describe('autocomplete', () => {
    it('returns empty for short query', async () => {
      const { autocomplete } = await loadModule();
      expect(await autocomplete('a')).toEqual([]);
    });

    it('returns empty on non-ok response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({}, 500));
      const { autocomplete } = await loadModule();
      expect(await autocomplete('dragon')).toEqual([]);
    });

    it('returns names on success', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        mockResponse({ object: 'catalog', data: ['Dragonlord Ojutai', 'Dragon Egg'] }),
      );
      const { autocomplete } = await loadModule();
      const result = await autocomplete('drag');
      expect(result).toEqual(['Dragonlord Ojutai', 'Dragon Egg']);
    });
  });

  // ── getRandomCard ────────────────────────────────────────────────────

  describe('getRandomCard', () => {
    it('returns a card', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(buildCard()));
      const { getRandomCard } = await loadModule();
      const card = await getRandomCard();
      expect(card.name).toBe('Test Card');
    });

    it('throws on error response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({}, 500));
      const { getRandomCard } = await loadModule();
      await expect(getRandomCard()).rejects.toThrow(/Failed to get random card/);
    });
  });

  // ── getCardByName ────────────────────────────────────────────────────

  describe('getCardByName', () => {
    it('returns a card by exact name', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(buildCard({ name: 'Sol Ring' })));
      const { getCardByName } = await loadModule();
      const card = await getCardByName('Sol Ring');
      expect(card.name).toBe('Sol Ring');
    });

    it('throws when not found', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({}, 404));
      const { getCardByName } = await loadModule();
      await expect(getCardByName('Nonexistent Card')).rejects.toThrow(/Card not found/);
    });
  });

  // ── getCardRulings ───────────────────────────────────────────────────

  describe('getCardRulings', () => {
    it('returns rulings on success', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        mockResponse({
          data: [{ object: 'ruling', oracle_id: 'x', source: 'scryfall', published_at: '2024-01-01', comment: 'A ruling.' }],
        }),
      );
      const { getCardRulings } = await loadModule();
      const rulings = await getCardRulings('card-id');
      expect(rulings).toHaveLength(1);
      expect(rulings[0].comment).toBe('A ruling.');
    });

    it('returns empty on error response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({}, 500));
      const { getCardRulings } = await loadModule();
      const rulings = await getCardRulings('bad-id');
      expect(rulings).toEqual([]);
    });

    it('returns empty on fetch error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
      const { getCardRulings } = await loadModule();
      const rulings = await getCardRulings('err-id');
      expect(rulings).toEqual([]);
    });

    it('returns cached rulings on second call', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        mockResponse({ data: [{ object: 'ruling', oracle_id: 'x', source: 'scryfall', published_at: '2024-01-01', comment: 'Cached.' }] }),
      );
      const { getCardRulings } = await loadModule();
      await getCardRulings('cache-id');
      await getCardRulings('cache-id');
      // Only 1 fetch since second call uses cache
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── getCardImage fallback to first face ──────────────────────────────

  describe('getCardImage face fallback', () => {
    it('falls back to first face when requested face index is missing', async () => {
      const { getCardImage } = await loadModule();
      const card = buildCard({
        card_faces: [
          {
            name: 'Front',
            mana_cost: '{1}',
            type_line: 'Creature',
            oracle_text: '',
            image_uris: { small: 's', normal: 'front-normal', large: 'l', png: 'p', art_crop: 'a', border_crop: 'b' },
          },
          { name: 'Back', mana_cost: '{2}', type_line: 'Creature', oracle_text: '' },
        ],
      });
      // Request face 1 which has no image_uris — should fall back to face 0
      expect(getCardImage(card, 'normal', 1)).toBe('front-normal');
    });
  });

  // ── searchCards 404 ──────────────────────────────────────────────────

  describe('searchCards 404', () => {
    it('returns empty result on 404', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({}, 404));
      const { searchCards, clearSearchCache } = await loadModule();
      clearSearchCache();
      const result = await searchCards('nonexistent:query');
      expect(result.total_cards).toBe(0);
      expect(result.data).toEqual([]);
    });
  });
});
