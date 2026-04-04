import { useMemo } from 'react';
import { FORMATS } from '@/data/formats';
import { CATEGORIES } from '@/components/deckbuilder/constants';
import type { DeckCard } from '@/hooks/useDeck';
import type { DeckSortMode } from '@/lib/deckbuilder/sort-deck-cards';
import { sortDeckCards } from '@/lib/deckbuilder/sort-deck-cards';
import { DEFAULT_CATEGORY } from '@/lib/deckbuilder/infer-category';
import type { ScryfallCard } from '@/types/card';

interface UseDeckEditorDerivedStateInput {
  cards: DeckCard[];
  deckFormat?: string;
  deckSortMode: DeckSortMode;
  scryfallCache: Map<string, ScryfallCard>;
}

export function useDeckEditorDerivedState({
  cards,
  deckFormat,
  deckSortMode,
  scryfallCache,
}: UseDeckEditorDerivedStateInput) {
  const mainboardCards = useMemo(
    () =>
      cards.filter(
        (card) => card.board !== 'sideboard' && card.board !== 'maybeboard',
      ),
    [cards],
  );

  const sideboardCards = useMemo(
    () => cards.filter((card) => card.board === 'sideboard'),
    [cards],
  );

  const maybeboardCards = useMemo(
    () => cards.filter((card) => card.board === 'maybeboard'),
    [cards],
  );

  const grouped = useMemo(() => {
    const groups: Record<string, DeckCard[]> = {};
    for (const card of mainboardCards) {
      const category = card.is_commander
        ? 'Commander'
        : card.category || DEFAULT_CATEGORY;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(card);
    }

    const sortedGroups: [string, DeckCard[]][] = [];
    for (const category of CATEGORIES) {
      if (groups[category]) {
        sortedGroups.push([category, groups[category]]);
      }
    }

    for (const [category, categoryCards] of Object.entries(groups)) {
      if (!(CATEGORIES as readonly string[]).includes(category)) {
        sortedGroups.push([category, categoryCards]);
      }
    }

    return sortedGroups;
  }, [mainboardCards]);

  const totalMainboard = useMemo(
    () => mainboardCards.reduce((sum, card) => sum + card.quantity, 0),
    [mainboardCards],
  );

  const totalSideboard = useMemo(
    () => sideboardCards.reduce((sum, card) => sum + card.quantity, 0),
    [sideboardCards],
  );

  const totalMaybeboard = useMemo(
    () => maybeboardCards.reduce((sum, card) => sum + card.quantity, 0),
    [maybeboardCards],
  );

  const formatConfig = useMemo(
    () => FORMATS.find((format) => format.value === deckFormat) ?? FORMATS[0],
    [deckFormat],
  );

  const sortedMainboard = useMemo(
    () =>
      deckSortMode === 'category'
        ? mainboardCards
        : sortDeckCards(mainboardCards, deckSortMode, scryfallCache),
    [mainboardCards, deckSortMode, scryfallCache],
  );

  return {
    mainboardCards,
    sideboardCards,
    maybeboardCards,
    grouped,
    totalMainboard,
    totalSideboard,
    totalMaybeboard,
    formatConfig,
    formatMax: formatConfig.max,
    sortedMainboard,
  };
}
