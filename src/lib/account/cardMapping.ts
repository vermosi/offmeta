/**
 * Mapping helpers between Scryfall results and the account's saved records.
 */

import type { ScryfallCard } from '@/types/card';
import type { SavedCardInput } from './pendingSave';

/**
 * Stable key for a query so "Treasure  Cards" and "treasure cards" are the
 * same saved search / history entry.
 */
export function normalizeQueryKey(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Denormalize the fields /saved needs so it renders without hitting Scryfall. */
export function toSavedCardInput(card: ScryfallCard): SavedCardInput {
  const face = card.card_faces?.[0];
  const priceRaw = card.prices?.usd ?? card.prices?.usd_foil ?? null;
  const price = priceRaw ? Number.parseFloat(priceRaw) : null;

  return {
    oracleId: card.oracle_id ?? card.id,
    cardName: card.name,
    scryfallId: card.id,
    imageUrl:
      card.image_uris?.normal ??
      card.image_uris?.small ??
      face?.image_uris?.normal ??
      null,
    manaCost: card.mana_cost || face?.mana_cost || null,
    cmc: typeof card.cmc === 'number' ? card.cmc : null,
    typeLine: card.type_line ?? face?.type_line ?? null,
    colors: card.colors ?? card.color_identity ?? [],
    priceUsd: price !== null && Number.isFinite(price) ? price : null,
  };
}
