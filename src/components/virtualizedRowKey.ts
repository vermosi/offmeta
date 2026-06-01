import type { ScryfallCard } from '@/types/card';

export function buildVirtualizedRowKey(
  cards: ScryfallCard[],
  columns: number,
  cardHeight: number,
  index: number,
): string {
  const startIndex = index * columns;
  const rowCardIds = cards
    .slice(startIndex, startIndex + columns)
    .map((card) => card.id)
    .join('|');

  return `${columns}-${cardHeight}-${index}-${rowCardIds}`;
}
