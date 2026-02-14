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

describe('card printings helpers', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('fetches printings, falls back to card face images, and caches results', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({
        object: 'list',
        total_cards: 2,
        has_more: false,
        data: [
          buildCard({
            id: 'face-card',
            collector_number: '1',
            image_uris: undefined,
            card_faces: [
              {
                name: 'Face A',
                type_line: 'Creature — Face',
                image_uris: {
                  small: 'small-face',
                  normal: 'normal-face',
                  large: 'large-face',
                  png: 'png-face',
                  art_crop: 'art-face',
                  border_crop: 'border-face',
                },
              },
            ],
          }),
          buildCard({
            id: 'image-card',
            collector_number: '2',
            image_uris: {
              small: 'small',
              normal: 'normal',
              large: 'large',
              png: 'png',
              art_crop: 'art',
              border_crop: 'border',
            },
          }),
        ],
      }),
    );

    const { getCardPrintings } = await import('@/lib/scryfall/printings');
    const result = await getCardPrintings('Test Card');

    expect(result).toHaveLength(2);
    expect(result[0].image_uris?.normal).toBe('normal-face');
    expect(result[1].image_uris?.normal).toBe('normal');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const cached = await getCardPrintings('Test Card');
    expect(cached).toHaveLength(2);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('waits for rate limiting and retries on transient errors', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        mockResponse({
          object: 'list',
          total_cards: 0,
          has_more: false,
          data: [],
        }),
      )
      .mockResolvedValueOnce(mockResponse({ object: 'error' }, 500))
      .mockResolvedValueOnce(
        mockResponse({
          object: 'list',
          total_cards: 1,
          has_more: false,
          data: [
            buildCard({
              id: 'retry-card',
              collector_number: '3',
            }),
          ],
        }),
      );

    const { getCardPrintings } = await import('@/lib/scryfall/printings');

    const first = getCardPrintings('Alpha');
    await vi.runAllTimersAsync();
    await first;

    const second = getCardPrintings('Beta');
    await vi.runAllTimersAsync();
    const result = await second;

    expect(result[0].id).toBe('retry-card');
  });

  it('returns an empty list when the response is not ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({ object: 'error' }, 404),
    );

    const { getCardPrintings } = await import('@/lib/scryfall/printings');
    const result = await getCardPrintings('Missing Card');

    expect(result).toEqual([]);
  });

  it('returns an empty list when fetch fails', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const { getCardPrintings } = await import('@/lib/scryfall/printings');
    const resultPromise = getCardPrintings('Broken Card');

    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual([]);
  });
});

describe('purchase URL helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a TCGPlayer URL with affiliate wrapping when configured', async () => {
    const originalEnv = process.env.NEXT_PUBLIC_TCGPLAYER_IMPACT_BASE;
    process.env.NEXT_PUBLIC_TCGPLAYER_IMPACT_BASE = 'https://aff.example/?u=';

    const { getTCGPlayerUrl } = await import('@/lib/scryfall/printings');
    const url = getTCGPlayerUrl(
      buildCard({
        name: 'Sol Ring',
        purchase_uris: { tcgplayer: 'https://tcgplayer.com/card/1' },
      }),
    );

    expect(url).toBe(
      'https://aff.example/?u=https%3A%2F%2Ftcgplayer.com%2Fcard%2F1',
    );

    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_TCGPLAYER_IMPACT_BASE;
    } else {
      process.env.NEXT_PUBLIC_TCGPLAYER_IMPACT_BASE = originalEnv;
    }
  });

  it('falls back to search URLs when purchase URIs are missing', async () => {
    const { getCardmarketUrl, getTCGPlayerUrl } =
      await import('@/lib/scryfall/printings');

    const card = buildCard({ name: 'Black Lotus', purchase_uris: undefined });

    expect(getTCGPlayerUrl(card)).toContain(
      'https://www.tcgplayer.com/search/magic/product',
    );
    expect(getCardmarketUrl(card)).toContain(
      'https://www.cardmarket.com/en/Magic/Products/Search',
    );
  });

  it('uses the cardmarket purchase URI when provided', async () => {
    const { getCardmarketUrl } = await import('@/lib/scryfall/printings');

    const card = buildCard({
      name: 'Tundra',
      purchase_uris: { cardmarket: 'https://cardmarket.example/tundra' },
    });

    expect(getCardmarketUrl(card)).toBe('https://cardmarket.example/tundra');
  });
});
