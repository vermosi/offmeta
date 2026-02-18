/**
 * Sorts a flat array of DeckCards by the given sort mode.
 * Requires access to the Scryfall cache for CMC/color/type/price data.
 * @module lib/deckbuilder/sort-deck-cards
 */

import type { DeckCard } from '@/hooks/useDeck';
import type { ScryfallCard } from '@/types/card';

export type DeckSortMode = 'category' | 'name' | 'cmc' | 'color' | 'type' | 'price';

const COLOR_ORDER: Record<string, number> = { W: 0, U: 1, B: 2, R: 3, G: 4, C: 5 };

export function sortDeckCards(
  cards: DeckCard[],
  sort: DeckSortMode,
  scryfallCache: Map<string, ScryfallCard>,
): DeckCard[] {
  return [...cards].sort((a, b) => {
    const sa = scryfallCache.get(a.card_name);
    const sb = scryfallCache.get(b.card_name);
    switch (sort) {
      case 'name':
        return a.card_name.localeCompare(b.card_name);
      case 'cmc':
        return (sa?.cmc ?? 99) - (sb?.cmc ?? 99) || a.card_name.localeCompare(b.card_name);
      case 'color': {
        const ca = sa?.color_identity[0] ?? 'C';
        const cb = sb?.color_identity[0] ?? 'C';
        return (COLOR_ORDER[ca] ?? 5) - (COLOR_ORDER[cb] ?? 5) || a.card_name.localeCompare(b.card_name);
      }
      case 'type':
        return (sa?.type_line ?? '').localeCompare(sb?.type_line ?? '') || a.card_name.localeCompare(b.card_name);
      case 'price': {
        const pa = parseFloat(sa?.prices?.usd ?? '0');
        const pb = parseFloat(sb?.prices?.usd ?? '0');
        return pb - pa;
      }
      default:
        return 0;
    }
  });
}
