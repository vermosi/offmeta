import { describe, expect, it } from 'vitest';
import { mapMtgjsonCardToPrintingRow } from './mtgjson';

describe('mtgjson mapper', () => {
  it('maps mtgjson card data into card_printings rows', () => {
    const row = mapMtgjsonCardToPrintingRow(
      { code: 'MH3', name: 'Modern Horizons 3' },
      {
        uuid: 'uuid-1',
        name: 'Slickshot Show-Off',
        collectorNumber: '123',
        identifiers: {
          scryfallId: 'scryfall-1',
          scryfallOracleId: 'oracle-1',
          mtgjsonV4Id: 'legacy-1',
        },
        prices: {
          usd: '3.25',
          usdFoil: '4.50',
        },
        purchaseUrls: {
          tcgplayer: 'https://tcgplayer.example/card',
          cardmarket: 'https://cardmarket.example/card',
        },
        relatedCards: {
          spellbook: ['uuid-2'],
        },
        releasedAt: '2024-06-14',
        language: 'en',
      },
    );

    expect(row).toEqual(
      expect.objectContaining({
        id: 'uuid-1',
        scryfall_id: 'scryfall-1',
        mtgjson_uuid: 'uuid-1',
        oracle_id: 'oracle-1',
        name: 'Slickshot Show-Off',
        set: 'MH3',
        set_name: 'Modern Horizons 3',
        collector_number: '123',
        prices: expect.objectContaining({ usd: '3.25', usd_foil: '4.50' }),
        purchase_uris: expect.objectContaining({
          tcgplayer: 'https://tcgplayer.example/card',
          cardmarket: 'https://cardmarket.example/card',
        }),
        related_cards: expect.objectContaining({ spellbook: ['uuid-2'] }),
        released_at: '2024-06-14',
        lang: 'en',
      }),
    );
  });
});

