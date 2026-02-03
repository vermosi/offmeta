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

const loadModule = async () => import('@/lib/scryfall');

describe('scryfall client', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('searchCards returns empty list on 404', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(mockResponse({ object: 'error' }, 404));

    const { searchCards } = await loadModule();
    const result = await searchCards('t:dragon');

    expect(result.total_cards).toBe(0);
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('searchCards returns results on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({
        object: 'list',
        total_cards: 1,
        has_more: false,
        data: [buildCard({ id: 'success-card' })],
      }),
    );

    const { searchCards } = await loadModule();
    const result = await searchCards('t:angel');

    expect(result.data[0].id).toBe('success-card');
  });

  it('searchCards throws on non-404 errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({ object: 'error' }, 500),
    );

    const { searchCards } = await loadModule();

    await expect(searchCards('t:elf')).rejects.toThrow(/Search failed/i);
  });

  it('autocomplete returns empty results for short queries', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { autocomplete } = await loadModule();

    const result = await autocomplete('s');

    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('autocomplete returns empty list on bad response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({ object: 'error' }, 500),
    );

    const { autocomplete } = await loadModule();
    const result = await autocomplete('so');

    expect(result).toEqual([]);
  });

  it('autocomplete returns suggestions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({
        object: 'catalog',
        total_values: 2,
        data: ['Sol Ring', 'Soul Warden'],
      }),
    );

    const { autocomplete } = await loadModule();
    const result = await autocomplete('so');

    expect(result).toEqual(['Sol Ring', 'Soul Warden']);
  });

  it('fetches random cards and named cards with error handling', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockResponse(buildCard({ id: 'random-card' })))
      .mockResolvedValueOnce(mockResponse(buildCard({ id: 'named-card' })))
      .mockResolvedValueOnce(mockResponse({ object: 'error' }, 500))
      .mockResolvedValueOnce(mockResponse({ object: 'error' }, 404));

    const { getRandomCard, getCardByName } = await loadModule();

    const randomCard = await getRandomCard();
    expect(randomCard.id).toBe('random-card');

    const namedCard = await getCardByName('Test Card');
    expect(namedCard.id).toBe('named-card');

    await expect(getRandomCard()).rejects.toThrow(/Failed to get random card/i);
    await expect(getCardByName('Missing Card')).rejects.toThrow(
      /Card not found/i,
    );
  });

  it('formats card display helpers correctly', async () => {
    const {
      getCardImage,
      isDoubleFacedCard,
      getCardFaceDetails,
      getRarityColor,
      formatManaSymbols,
    } = await loadModule();

    const cardWithImage = buildCard({
      image_uris: {
        small: 'small',
        normal: 'normal',
        large: 'large',
        png: 'png',
        art_crop: 'art',
        border_crop: 'border',
      },
    });

    const doubleFacedCard = buildCard({
      card_faces: [
        {
          name: 'Front',
          mana_cost: '{1}{U}',
          type_line: 'Creature — Front',
          oracle_text: 'Front text',
          image_uris: {
            small: 'front-small',
            normal: 'front-normal',
            large: 'front-large',
            png: 'front-png',
            art_crop: 'front-art',
            border_crop: 'front-border',
          },
        },
        {
          name: 'Back',
          mana_cost: '{2}{U}',
          type_line: 'Creature — Back',
          oracle_text: 'Back text',
          image_uris: {
            small: 'back-small',
            normal: 'back-normal',
            large: 'back-large',
            png: 'back-png',
            art_crop: 'back-art',
            border_crop: 'back-border',
          },
        },
      ],
    });

    expect(getCardImage(cardWithImage, 'normal')).toBe('normal');
    expect(getCardImage(doubleFacedCard, 'small', 1)).toBe('back-small');
    expect(getCardImage(doubleFacedCard, 'large', 2)).toBe('front-large');
    expect(getCardImage(buildCard(), 'normal')).toBe('/placeholder.svg');

    expect(isDoubleFacedCard(doubleFacedCard)).toBe(true);
    expect(isDoubleFacedCard(cardWithImage)).toBe(false);

    expect(getCardFaceDetails(doubleFacedCard, 1).name).toBe('Back');
    expect(getCardFaceDetails(cardWithImage).name).toBe('Test Card');

    expect(getRarityColor('mythic')).toBe('text-orange-400');
    expect(getRarityColor('rare')).toBe('text-gold');
    expect(getRarityColor('uncommon')).toBe('text-slate-300');
    expect(getRarityColor('common')).toBe('text-muted-foreground');

    expect(formatManaSymbols('{2}{W}{U}')).toEqual(['2', 'W', 'U']);
    expect(formatManaSymbols('')).toEqual([]);
  });

  it('fetches rulings with caching and error handling', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        mockResponse({
          data: [
            {
              oracle_id: '1',
              source: 'wotc',
              published_at: '2020-01-01',
              comment: 'a',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(mockResponse({ object: 'error' }, 500))
      .mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const { getCardRulings } = await loadModule();

    const first = await getCardRulings('card-1');
    expect(first).toHaveLength(1);

    const cached = await getCardRulings('card-1');
    expect(cached).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const badResponse = await getCardRulings('card-2');
    expect(badResponse).toEqual([]);

    const errorResponse = await getCardRulings('card-3');
    expect(errorResponse).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('rejects when the request queue is full', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    let resolveFetch: (value: Response) => void = () => {};
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    vi.spyOn(globalThis, 'fetch').mockImplementation(() => fetchPromise);

    const { searchCards } = await loadModule();

    const inFlight = searchCards('t:dragon');
    const queued = Array.from({ length: 50 }, (_, index) =>
      searchCards(`t:card-${index}`),
    );

    await expect(searchCards('t:overflow')).rejects.toThrow(
      /Too many pending requests/i,
    );

    resolveFetch(
      mockResponse({
        object: 'list',
        total_cards: 0,
        has_more: false,
        data: [],
      }),
    );

    await vi.runAllTimersAsync();
    await Promise.allSettled([inFlight, ...queued]);
  });
});
