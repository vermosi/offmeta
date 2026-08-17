import { createRef, forwardRef } from 'react';
import type { ComponentProps } from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SearchResultsArea } from '../SearchResultsArea';
import type { ScryfallCard } from '@/types/card';
import { rerankCardsWithIntelligence } from '@/lib/search/intelligence-ranking';

vi.mock('@/hooks', () => ({
  useBatchPriceHistory: () => ({ data: new Map<string, unknown>() }),
  useAuth: () => ({ user: null }),
  useResultsEngagement: vi.fn(),
}));

vi.mock('@/lib/search/intelligence-ranking', () => ({
  rerankCardsWithIntelligence: vi.fn(),
}));

vi.mock('@/components/RelatedCardsStrip', () => ({
  RelatedCardsStrip: ({ sourceCard }: { sourceCard: ScryfallCard | null }) => (
    <div data-testid="related-source">{sourceCard?.name ?? 'none'}</div>
  ),
}));

vi.mock('@/components/CardListItem', () => ({
  CardListItem: ({ card }: { card: ScryfallCard }) => (
    <div data-testid="card-list-item">{card.name}</div>
  ),
}));

vi.mock('@/components/CardItem', () => ({
  CardItem: ({ card }: { card: ScryfallCard }) => (
    <div data-testid="card-item">{card.name}</div>
  ),
}));

vi.mock('@/components/SearchResultsSkeleton', () => ({
  SearchResultsSkeleton: () => null,
}));

vi.mock('@/components/LoadMoreIndicator', () => ({
  LoadMoreIndicator: forwardRef<HTMLDivElement, Record<string, unknown>>(
    (_props, _ref) => <div data-testid="load-more" />,
  ),
}));

vi.mock('@/components/VirtualizedCardGrid', () => ({
  VirtualizedCardGrid: () => null,
}));

vi.mock('@/components/FeatureCrossLinks', () => ({
  FeatureCrossLinks: () => null,
}));

vi.mock('@/components/ExplanationPanel', () => ({
  ExplanationPanel: () => null,
}));

const mockedRerank = vi.mocked(rerankCardsWithIntelligence);

function makeCard(
  name: string,
  overrides: Partial<ScryfallCard> = {},
): ScryfallCard {
  return {
    id: overrides.id ?? name.toLowerCase().replace(/\s+/g, '-'),
    name,
    type_line: overrides.type_line ?? 'Creature',
    oracle_text: overrides.oracle_text ?? '',
    color_identity: overrides.color_identity ?? [],
    colors: overrides.colors ?? [],
    cmc: overrides.cmc ?? 3,
    edhrec_rank: overrides.edhrec_rank ?? 1000,
    prices: overrides.prices ?? {},
    legalities: overrides.legalities ?? {},
    rarity: overrides.rarity ?? 'rare',
    set: overrides.set ?? 'tst',
    set_name: overrides.set_name ?? 'Test Set',
  } as ScryfallCard;
}

function renderSearchResultsArea(
  overrides: Partial<ComponentProps<typeof SearchResultsArea>> = {},
) {
  const cards = overrides.cards ?? [
    makeCard('Raw Top'),
    makeCard('Second Card'),
  ];
  const displayCards = overrides.displayCards ?? [
    cards[0],
    cards[1] ?? makeCard('Second Card'),
  ];

  return render(
    <SearchResultsArea
      id="search-results"
      activeTab="cards"
      activeSort={undefined}
      cards={cards}
      displayCards={displayCards}
      totalCards={displayCards.length}
      viewMode="list"
      isSearching={false}
      hasSearched={true}
      searchQuery="test query"
      originalQuery="test query"
      queryQualityScore={0.1}
      queryConfidence={0.9}
      querySampleSize={40}
      hasNextPage={false}
      isFetchingNextPage={false}
      fetchNextPage={vi.fn()}
      handleCardClick={vi.fn()}
      handleTryExample={vi.fn()}
      loadMoreRef={createRef<HTMLDivElement>()}
      getRovingProps={() => ({
        ref: vi.fn(),
        tabIndex: 0,
        onKeyDown: vi.fn(),
        onFocus: vi.fn(),
      })}
      onTrySuggestion={vi.fn()}
      collectionLookup={new Map()}
      intent={null}
      {...overrides}
    />,
  );
}

describe('SearchResultsArea', () => {
  beforeEach(() => {
    mockedRerank.mockReset();
  });

  it('seeds related cards from the reranked first card when reranking is active', () => {
    const rankedTop = makeCard('Ranked Top');
    const rawTop = makeCard('Raw Top');
    mockedRerank.mockReturnValue([rankedTop, rawTop]);

    renderSearchResultsArea({
      cards: [rawTop, makeCard('Second Card')],
      displayCards: [rawTop, makeCard('Second Card')],
    });

    expect(screen.getByTestId('related-source')).toHaveTextContent(
      'Ranked Top',
    );
  });

  it('falls back to the raw first card when custom sorting bypasses reranking', () => {
    const rawTop = makeCard('Raw Top');
    const displayTop = makeCard('Display Top');
    mockedRerank.mockReturnValue([displayTop, rawTop]);

    renderSearchResultsArea({
      activeSort: 'name-asc',
      cards: [rawTop, makeCard('Second Card')],
      displayCards: [displayTop, rawTop],
    });

    expect(screen.getByTestId('related-source')).toHaveTextContent('Raw Top');
  });
});
