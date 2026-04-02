/**
 * Renders the card results area: grid/list/images views, virtualized grid,
 * load-more, empty state, skeleton loaders, and non-card tab content.
 * @module components/SearchResultsArea
 */

import { lazy, useMemo } from 'react';
import { useBatchPriceHistory } from '@/hooks/useBatchPriceHistory';

import { CardItem } from '@/components/CardItem';
import { CardListItem } from '@/components/CardListItem';
import { CardImageItem } from '@/components/CardImageItem';
import { CardSkeletonGrid } from '@/components/CardSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { LoadMoreIndicator } from '@/components/LoadMoreIndicator';
import { VirtualizedCardGrid } from '@/components/VirtualizedCardGrid';
import { RelatedCardsStrip } from '@/components/RelatedCardsStrip';
import { FeatureCrossLinks } from '@/components/FeatureCrossLinks';
import { SimilarCardsPanel } from '@/components/SimilarCardsPanel';
import { DeckIdeasPanel } from '@/components/DeckIdeasPanel';
import { ExplanationPanel } from '@/components/ExplanationPanel';
import { CLIENT_CONFIG } from '@/lib/config';
import { useTranslation } from '@/lib/i18n';
import { rerankCardsWithIntelligence } from '@/lib/search/intelligence-ranking';
import { useAuth } from '@/hooks/useAuth';
import type { ScryfallCard } from '@/types/card';
import type { ViewMode } from '@/lib/view-mode-storage';
import type { ResultsTab } from '@/components/ResultsTabs';
import type { SimilarityData } from '@/hooks/useSimilarCards';
import type { DeckIdea } from '@/hooks/useDeckIdeas';
import type { QuerySuggestion } from '@/hooks/useQuerySuggestions';

const ArtLightbox = lazy(() =>
  import('@/components/ArtLightbox').then((m) => ({ default: m.ArtLightbox })),
);

interface SearchResultsAreaProps {
  activeTab: ResultsTab;
  cards: ScryfallCard[];
  displayCards: ScryfallCard[];
  totalCards: number;
  viewMode: ViewMode;
  isSearching: boolean;
  hasSearched: boolean;
  searchQuery: string;
  originalQuery: string;
  queryQualityScore: number;
  queryConfidence: number;
  querySampleSize: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  handleCardClick: (card: ScryfallCard, index: number) => void;
  handleTryExample: (query: string) => void;
  compareMode: boolean;
  toggleCompareCard: (card: ScryfallCard) => void;
  isCardSelected: (id: string) => boolean;
  collectionLookup: Map<string, number>;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
  getRovingProps: (index: number) => {
    ref: (el: HTMLDivElement | null) => void;
    tabIndex: number;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onFocus: () => void;
  };
  lightboxIndex: number | null;
  openLightbox: (index: number) => void;
  closeLightbox: () => void;
  // Tab content data
  similarityData: SimilarityData | null | undefined;
  similarLoading: boolean;
  deckIdea: DeckIdea | null | undefined;
  deckIdeasLoading: boolean;
  // Query suggestions for empty state
  querySuggestions: QuerySuggestion[];
  isCheckingSuggestions: boolean;
  onTrySuggestion: (scryfallQuery: string) => void;
  onRelatedCardClick?: (cardName: string) => void;
}

export function SearchResultsArea({
  activeTab,
  cards,
  displayCards,
  totalCards,
  viewMode,
  isSearching,
  hasSearched,
  searchQuery,
  originalQuery,
  queryQualityScore,
  queryConfidence,
  querySampleSize,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  handleCardClick,
  handleTryExample,
  compareMode,
  toggleCompareCard,
  isCardSelected,
  collectionLookup,
  loadMoreRef,
  getRovingProps,
  lightboxIndex,
  openLightbox,
  closeLightbox,
  similarityData,
  similarLoading,
  deckIdea,
  deckIdeasLoading,
  querySuggestions,
  isCheckingSuggestions,
  onTrySuggestion,
  onRelatedCardClick,
}: SearchResultsAreaProps) {
  const { t } = useTranslation();

  // Memoize the top source card for the related strip
  const topSourceCard = useMemo(
    () => (cards.length > 0 ? cards[0] : null),
    [cards],
  );

  // Batch-fetch sparkline data for visible cards
  const sparklineNames = useMemo(
    () => displayCards.map((c) => c.name).slice(0, 200),
    [displayCards],
  );
  const { data: sparklineMap } = useBatchPriceHistory(sparklineNames);
  const { user } = useAuth();
  const hadFastClick =
    sessionStorage.getItem('offmeta_fast_click_query') === originalQuery;
  const hadRefinement = sessionStorage.getItem('offmeta_once:first_refinement') === '1';
  const rankedCards = useMemo(
    () =>
      rerankCardsWithIntelligence(displayCards, {
        queryQualityScore,
        queryConfidence,
        querySampleSize,
        ownedCards: collectionLookup,
        hadFastClick,
        hadRefinement,
        isAuthenticated: !!user,
      }),
    [
      displayCards,
      queryQualityScore,
      queryConfidence,
      querySampleSize,
      collectionLookup,
      hadFastClick,
      hadRefinement,
      user,
    ],
  );
  return (
    <div className="mt-3 sm:mt-6 container-main">
      {/* Cards tab */}
      {activeTab === 'cards' && (
        <>
          {totalCards > 0 && cards.length > 0 ? (
            <>
              {displayCards.length > 0 ? (
                viewMode === 'grid' &&
                displayCards.length > CLIENT_CONFIG.VIRTUALIZATION_THRESHOLD ? (
                  <VirtualizedCardGrid
                    cards={rankedCards}
                    onCardClick={handleCardClick}
                    onLoadMore={
                      hasNextPage && !isFetchingNextPage
                        ? fetchNextPage
                        : undefined
                    }
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                  />
                ) : viewMode === 'list' ? (
                  <div
                    className="flex flex-col gap-1.5"
                    role="list"
                    aria-label="Search results"
                    data-testid="list-view"
                  >
                    {rankedCards.map((card, index) => {
                      const rovingProps = getRovingProps(index);
                      return (
                        <div
                          key={card.id}
                          className="animate-reveal"
                          role="listitem"
                          style={{
                            animationDelay: `${Math.min(index * 15, 200)}ms`,
                          }}
                          ref={rovingProps.ref}
                          onKeyDown={rovingProps.onKeyDown}
                          onFocus={rovingProps.onFocus}
                        >
                          <CardListItem
                            card={card}
                            onClick={() => handleCardClick(card, index)}
                            tabIndex={rovingProps.tabIndex}
                            isOwned={collectionLookup.has(card.name)}
                            sparklineData={sparklineMap?.get(card.name)}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : viewMode === 'images' ? (
                  <div
                    className="grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3"
                    role="list"
                    aria-label="Search results"
                    data-testid="images-view"
                  >
                    {rankedCards.map((card, index) => {
                      const rovingProps = getRovingProps(index);
                      return (
                        <div
                          key={card.id}
                          className="animate-reveal"
                          role="listitem"
                          style={{
                            animationDelay: `${Math.min(index * 15, 200)}ms`,
                          }}
                          ref={rovingProps.ref}
                          onKeyDown={rovingProps.onKeyDown}
                          onFocus={rovingProps.onFocus}
                        >
                          <CardImageItem
                            card={card}
                            onClick={() => openLightbox(index)}
                            tabIndex={rovingProps.tabIndex}
                            isOwned={collectionLookup.has(card.name)}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className="grid grid-cols-2 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 content-visibility-auto"
                    role="list"
                    aria-label="Search results"
                    data-testid="standard-grid"
                  >
                    {rankedCards.map((card, index) => {
                      const rovingProps = getRovingProps(index);
                      return (
                        <div
                          key={card.id}
                          className={`animate-reveal relative ${compareMode ? '' : 'contain-layout'}`}
                          role="listitem"
                          style={{
                            animationDelay: `${Math.min(index * 25, 300)}ms`,
                            ...(compareMode
                              ? {}
                              : {
                                  contentVisibility: 'auto',
                                  containIntrinsicSize: '0 200px',
                                }),
                          }}
                          ref={rovingProps.ref}
                          onKeyDown={rovingProps.onKeyDown}
                          onFocus={rovingProps.onFocus}
                        >
                          {compareMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCompareCard(card);
                              }}
                              className={`absolute top-2 left-2 z-10 h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                                isCardSelected(card.id)
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : 'bg-card/80 border-border/60 text-muted-foreground hover:border-primary/50'
                              }`}
                              aria-label={
                                isCardSelected(card.id)
                                  ? t('compare.removeFrom')
                                  : t('compare.addTo')
                              }
                              tabIndex={-1}
                            >
                              {isCardSelected(card.id) ? '✓' : '+'}
                            </button>
                          )}
                          <CardItem
                            card={card}
                            onClick={() =>
                              compareMode
                                ? toggleCompareCard(card)
                                : handleCardClick(card, index)
                            }
                            tabIndex={rovingProps.tabIndex}
                            isOwned={collectionLookup.has(card.name)}
                            sparklineData={sparklineMap?.get(card.name)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {t('results.noMatch')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('results.adjustFilters')}
                  </p>
                </div>
              )}

              <LoadMoreIndicator
                ref={
                  displayCards.length <= CLIENT_CONFIG.VIRTUALIZATION_THRESHOLD
                    ? loadMoreRef
                    : undefined
                }
                isFetchingNextPage={isFetchingNextPage}
                hasNextPage={hasNextPage}
                totalCards={totalCards}
                showEndMessage={cards.length > 0}
              />

              {/* Related cards discovery strip */}
              <RelatedCardsStrip
                sourceCard={topSourceCard}
                onCardClick={onRelatedCardClick}
              />
            </>
          ) : isSearching ? (
            <CardSkeletonGrid count={10} />
          ) : hasSearched && totalCards === 0 ? (
            <EmptyState
              query={searchQuery}
              onTryExample={handleTryExample}
              suggestions={querySuggestions}
              isCheckingSuggestions={isCheckingSuggestions}
              onTrySuggestion={onTrySuggestion}
            />
          ) : null}

          {/* Cross-links to other tools — show after results loaded */}
          {hasSearched && !isSearching && totalCards > 0 && (
            <div className="container-main mt-6">
              <FeatureCrossLinks />
            </div>
          )}
        </>
      )}

      {/* Similar tab */}
      {activeTab === 'similar' && (
        <SimilarCardsPanel
          data={similarityData}
          isLoading={similarLoading}
          onCardClick={handleCardClick}
        />
      )}

      {/* Deck Ideas tab */}
      {activeTab === 'deck-ideas' && (
        <DeckIdeasPanel
          data={deckIdea}
          isLoading={deckIdeasLoading}
          query={originalQuery}
        />
      )}

      {/* Explanation tab */}
      {activeTab === 'explanation' && (
        <ExplanationPanel
          card={
            similarityData?.sourceCard ??
            (cards.length > 0 && cards.length <= 5 ? cards[0] : null)
          }
          isLoading={isSearching}
        />
      )}

      {/* Art lightbox */}
      {lightboxIndex !== null && displayCards.length > 0 && (
        <ArtLightbox
          cards={displayCards}
          initialIndex={lightboxIndex}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
}
