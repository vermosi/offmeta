/**
 * Renders the card results area: grid/list/images views, virtualized grid,
 * load-more, empty state, skeleton loaders, and non-card tab content.
 * @module components/SearchResultsArea
 */

import { lazy, Suspense, useCallback, useMemo } from 'react';
import { CardItem } from '@/components/CardItem';
import { CardListItem } from '@/components/CardListItem';
import { CardImageItem } from '@/components/CardImageItem';
import { CardSkeletonGrid } from '@/components/CardSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { LoadMoreIndicator } from '@/components/LoadMoreIndicator';
import { VirtualizedCardGrid } from '@/components/VirtualizedCardGrid';
import { SimilarCardsPanel } from '@/components/SimilarCardsPanel';
import { DeckIdeasPanel } from '@/components/DeckIdeasPanel';
import { ExplanationPanel } from '@/components/ExplanationPanel';
import { CLIENT_CONFIG } from '@/lib/config';
import { useTranslation } from '@/lib/i18n';
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
  similarityData: unknown;
  similarLoading: boolean;
  deckIdea: unknown;
  deckIdeasLoading: boolean;
  // Query suggestions for empty state
  querySuggestions: Array<{ query: string; label: string }>;
  isCheckingSuggestions: boolean;
  onTrySuggestion: (scryfallQuery: string) => void;
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
}: SearchResultsAreaProps) {
  const { t } = useTranslation();

  return (
    <div className="mt-3 sm:mt-6 container-main">
      {/* Cards tab */}
      {activeTab === 'cards' && (
        <>
          {cards.length > 0 ? (
            <>
              {displayCards.length > 0 ? (
                viewMode === 'grid' &&
                displayCards.length > CLIENT_CONFIG.VIRTUALIZATION_THRESHOLD ? (
                  <VirtualizedCardGrid
                    cards={displayCards}
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
                    {displayCards.map((card, index) => {
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
                    {displayCards.map((card, index) => {
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
                    {displayCards.map((card, index) => {
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
            (similarityData as any)?.sourceCard ??
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
