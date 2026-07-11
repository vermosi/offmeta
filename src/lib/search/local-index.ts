import { Index } from 'flexsearch';
import type { ScryfallCard } from '@/types/card';

export interface LocalSearchHit {
  id: string;
  name: string;
}

type SearchIndex = Index;

export function createCardSearchIndex(cards: ScryfallCard[]): SearchIndex {
  const index = new FlexSearch.Index({
    preset: 'match',
    tokenize: 'forward',
    cache: true,
  });

  for (const card of cards) {
    index.add(card.id, `${card.name} ${card.type_line ?? ''} ${card.oracle_text ?? ''}`);
  }

  return index;
}

export function searchCardIndex(
  index: SearchIndex | null,
  cards: ScryfallCard[],
  query: string,
  limit = 8,
): LocalSearchHit[] {
  if (!index || !query.trim()) return [];
  const matches = index.search(query, limit) as string[] | null;
  if (!matches?.length) return [];

  const cardById = new Map(cards.map((card) => [card.id, card] as const));
  return matches
    .map((id) => {
      const card = cardById.get(id);
      return card ? { id: card.id, name: card.name } : null;
    })
    .filter((hit): hit is LocalSearchHit => hit !== null);
}

