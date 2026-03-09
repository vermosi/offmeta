/**
 * Home page — the primary search interface.
 * Orchestrates the search bar, card grid, filters, modals, comparison,
 * discovery sections, and tabbed results (Cards | Similar | Deck Ideas | Explain).
 * All search state is managed via the `useSearch` hook.
 * @module pages/Index
 */
import {
  lazy,
  Suspense,
  useEffect,
  useCallback,
  useState,
  useMemo,
  useRef,
} from 'react';
import { OnboardingWalkthrough } from '@/components/OnboardingWalkthrough';
import { useOnboarding } from '@/hooks/useOnboarding';
import { UnifiedSearchBar } from '@/components/UnifiedSearchBar';
import { EditableQueryBar } from '@/components/EditableQueryBar';
import { SaveSearchButton } from '@/components/SaveSearchButton';
import { ExplainCompilationPanel } from '@/components/ExplainCompilationPanel';
import { ReportIssueDialog } from '@/components/ReportIssueDialog';
import { SearchFilters } from '@/components/SearchFilters';
import { CardItem } from '@/components/CardItem';
import { CardListItem } from '@/components/CardListItem';
import { CardImageItem } from '@/components/CardImageItem';
import { CardSkeletonGrid } from '@/components/CardSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
const HomeDiscoverySection = lazy(() =>
  import('@/components/HomeDiscoverySection').then((m) => ({
    default: m.HomeDiscoverySection,
  })),
);
import { LoadMoreIndicator } from '@/components/LoadMoreIndicator';
import { ScrollToTop } from '@/components/ScrollToTop';
const SimilarSearches = lazy(() =>
  import('@/components/SimilarSearches').then((m) => ({
    default: m.SimilarSearches,
  })),
);
import { VirtualizedCardGrid } from '@/components/VirtualizedCardGrid';
import { ExportResults } from '@/components/ExportResults';
import { ShareSearchButton } from '@/components/ShareSearchButton';
import { ViewToggle } from '@/components/ViewToggle';
import { type ViewMode, getStoredViewMode } from '@/lib/view-mode-storage';
import { ResultsStats } from '@/components/ResultsStats';
import { ResultsTabs, type ResultsTab } from '@/components/ResultsTabs';
import { SimilarCardsPanel } from '@/components/SimilarCardsPanel';
import { DeckIdeasPanel } from '@/components/DeckIdeasPanel';
import { ExplanationPanel } from '@/components/ExplanationPanel';
const ArtLightbox = lazy(() =>
  import('@/components/ArtLightbox').then((m) => ({ default: m.ArtLightbox })),
);
const CompareBar = lazy(() =>
  import('@/components/CompareBar').then((m) => ({ default: m.CompareBar })),
);
const CompareModal = lazy(() =>
  import('@/components/CompareModal').then((m) => ({
    default: m.CompareModal,
  })),
);
const PwaInstallBanner = lazy(() =>
  import('@/components/PwaInstallBanner').then((m) => ({
    default: m.PwaInstallBanner,
  })),
);
import { SkipLinks } from '@/components/SkipLinks';

import { GitCompareArrows } from 'lucide-react';
import { CLIENT_CONFIG } from '@/lib/config';
import {
  applySeoMeta,
  buildSearchCanonical,
  injectJsonLd,
  buildSearchResultsJsonLd,
} from '@/lib/seo';
import { useSearch } from '@/hooks/useSearch';
import { useTranslation } from '@/lib/i18n';
import { useCompare } from '@/hooks/useCompare';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useRovingTabIndex } from '@/hooks/useRovingTabIndex';
import { useCollectionLookup } from '@/hooks/useCollection';
import { useAuth } from '@/hooks/useAuth';
import { useSimilarCards } from '@/hooks/useSimilarCards';
import { useDeckIdeas } from '@/hooks/useDeckIdeas';
import { useQuerySuggestions } from '@/hooks/useQuerySuggestions';
const CardModal = lazy(() => import('@/components/CardModal'));

const Index = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const collectionLookup = useCollectionLookup();
  const { isActive: onboardingActive, step: onboardingStep, advance: onboardingAdvance, dismiss: onboardingDismiss } = useOnboarding();
  const searchBarContainerRef = useRef<HTMLDivElement>(null);

  const fillOnboardingExample = useCallback(() => {
    const input = document.getElementById('search-input') as HTMLInputElement | null;
    if (input) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      nativeInputValueSetter?.call(input, 'creatures that make treasure tokens');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, []);
  const {
    searchQuery,
    originalQuery,
    selectedCard,
    setSelectedCard,
    hasSearched,
    lastSearchResult,
    lastIntent,
    activeFilters,
    filtersResetKey,
    reportDialogOpen,
    setReportDialogOpen,
    currentRequestId,
    cards,
    displayCards,
    totalCards,
    isSearching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    searchBarRef,
    loadMoreRef,
    handleSearch,
    handleRerunEditedQuery,
    handleCardClick,
    handleTryExample,
    handleRegenerateTranslation,
    handleFilteredCards,
    initialUrlFilters,
  } = useSearch();

  // View mode toggle
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode);

  // Results tab state
  const [tabState, setTabState] = useState<{ query: string; tab: ResultsTab }>(
    () => ({
      query: originalQuery,
      tab: 'cards',
    }),
  );
  // Keep tab reset derived from query changes so we avoid setState inside effects.
  const activeTab = tabState.query === originalQuery ? tabState.tab : 'cards';

  // Similar cards & deck ideas hooks
  const {
    similarityData,
    isLoading: similarLoading,
    activate: activateSimilar,
  } = useSimilarCards(originalQuery);
  const {
    deckIdea,
    isLoading: deckIdeasLoading,
    isDeckQuery,
    activate: activateDeckIdeas,
  } = useDeckIdeas(originalQuery);

  // "Did you mean?" suggestions when 0 results
  const { suggestions: querySuggestions, isChecking: isCheckingSuggestions } =
    useQuerySuggestions(searchQuery, totalCards, hasSearched && !isSearching);

  const handleTrySuggestion = useCallback(
    (scryfallQuery: string) => {
      handleRerunEditedQuery(scryfallQuery);
    },
    [handleRerunEditedQuery],
  );

  // Activate feature hooks when tab is selected
  const handleTabChange = useCallback(
    (tab: ResultsTab) => {
      if (tab === activeTab) return;
      setTabState({ query: originalQuery, tab });
      if (tab === 'similar') activateSimilar();
      if (tab === 'deck-ideas') activateDeckIdeas();
    },
    [activateSimilar, activateDeckIdeas, activeTab, originalQuery],
  );

  // Card comparison
  const {
    compareCards,
    compareOpen,
    toggleCompareCard,
    removeCompareCard,
    clearCompare,
    openCompare,
    closeCompare,
    isCardSelected,
  } = useCompare();
  const [compareMode, setCompareMode] = useState(false);

  // Keyboard shortcuts
  const focusSearch = useCallback(() => {
    const input = document.getElementById('search-input');
    input?.focus();
  }, []);
  useKeyboardShortcuts({ onFocusSearch: focusSearch });

  // Art lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const openLightbox = useCallback(
    (index: number) => setLightboxIndex(index),
    [],
  );
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  // Roving tabindex column count based on view mode
  const rovingColumns = useMemo(() => {
    if (viewMode === 'list') return 1;
    if (viewMode === 'images') return 6;
    return 4;
  }, [viewMode]);

  const rovingActivate = useCallback(
    (index: number) => {
      if (viewMode === 'images') {
        openLightbox(index);
      } else if (displayCards[index]) {
        handleCardClick(displayCards[index], index);
      }
    },
    [viewMode, displayCards, handleCardClick, openLightbox],
  );

  const { getRovingProps } = useRovingTabIndex({
    itemCount: displayCards.length,
    columns: rovingColumns,
    onActivate: rovingActivate,
  });

  // Parallax scroll effect (background-position only, avoids translated-layer seams)
  useEffect(() => {
    const el = document.querySelector(
      '[data-parallax="gradient"]',
    ) as HTMLElement | null;

    let rafId = 0;
    const update = () => {
      rafId = 0;
      if (!el) return;
      const y = window.scrollY || 0;
      const p1 = 20 + y * 0.08;
      const p2 = 50 + y * 0.04;
      const p3 = 75 + y * 0.03;
      el.style.backgroundPosition = `50% ${p1}px, 75% ${p2}px, 25% ${p3}px`;
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  // Handle hash-based scroll
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const timeout = setTimeout(() => {
      const el = document.getElementById(hash.slice(1));
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
    return () => clearTimeout(timeout);
  }, []);

  // SEO: JSON-LD for search results + dynamic OG image + canonical dedup
  const jsonLdCleanup = useRef<(() => void) | null>(null);
  useEffect(() => {
    // Cleanup previous
    jsonLdCleanup.current?.();
    jsonLdCleanup.current = null;

    if (!hasSearched || isSearching || displayCards.length === 0) return;

    // Inject ItemList JSON-LD for AEO
    jsonLdCleanup.current = injectJsonLd(
      buildSearchResultsJsonLd(displayCards, originalQuery),
    );

    // Dynamic OG image: use first card's art crop
    const firstArt =
      displayCards[0]?.image_uris?.art_crop ??
      displayCards[0]?.card_faces?.[0]?.image_uris?.art_crop;
    if (firstArt) {
      let ogImg = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
      if (!ogImg) {
        ogImg = document.createElement('meta');
        ogImg.setAttribute('property', 'og:image');
        document.head.appendChild(ogImg);
      }
      ogImg.content = firstArt;
    }

    // Canonical dedup: base canonical on compiled Scryfall query slug, not NL input
    const compiledQuery = lastSearchResult?.scryfallQuery || searchQuery;
    const canonicalUrl = compiledQuery
      ? buildSearchCanonical(compiledQuery)
      : `https://offmeta.app/`;

    // SEO title + description
    const desc = `Find ${totalCards} Magic: The Gathering cards matching "${originalQuery}" — off-meta picks, alternatives & synergies.`;
    applySeoMeta({
      title: `${originalQuery} — MTG Card Search | OffMeta`,
      description: desc.slice(0, 160),
      url: canonicalUrl,
      type: 'website',
      image: displayCards[0]?.image_uris?.art_crop,
    });

    return () => {
      jsonLdCleanup.current?.();
      jsonLdCleanup.current = null;
    };
  }, [hasSearched, isSearching, displayCards, originalQuery, searchQuery, lastSearchResult, totalCards]);


  const showSimilarTab = hasSearched && !isSearching;
  const showDeckIdeasTab = hasSearched && !isSearching && isDeckQuery;
  const showExplanationTab = hasSearched && !isSearching;

  return (
    <ErrorBoundary>
      <SkipLinks showSearchLink />
      <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background relative overflow-x-hidden">
        {/* Background layers with parallax */}
        <div
          className="fixed inset-0 pointer-events-none bg-page-gradient"
          aria-hidden="true"
          data-parallax="gradient"
        />
        <div
          className="fixed inset-0 pointer-events-none bg-page-noise"
          aria-hidden="true"
          style={{ opacity: 0.035 }}
        />

        <Header />

        {!hasSearched && <HeroSection />}

        {/* Screen reader search status announcements */}
        <div
          className="sr-only"
          role="status"
          aria-live="assertive"
          aria-atomic="true"
        >
          {isSearching
            ? t('a11y.searching')
            : hasSearched && totalCards > 0
              ? t('a11y.foundCards').replace(
                  '{count}',
                  totalCards.toLocaleString(),
                )
              : hasSearched && totalCards === 0
                ? t('a11y.noCardsFound')
                : ''}
        </div>

        {/* Main content */}
        <main
          id="main-content"
          className={`relative flex-1 ${hasSearched ? 'pt-4 sm:pt-6' : 'pt-2 sm:pt-3'} pb-4 sm:pb-8 safe-bottom`}
          role="main"
        >
          <div className="container-main space-y-3 sm:space-y-6">
            <div ref={searchBarContainerRef}>
              <UnifiedSearchBar
                ref={searchBarRef}
                onSearch={handleSearch}
                isLoading={isSearching}
                lastTranslatedQuery={lastSearchResult?.scryfallQuery}
                filters={activeFilters}
                isCardFetching={isSearching}
              />
            </div>

            <OnboardingWalkthrough
              isActive={onboardingActive}
              step={onboardingStep}
              onAdvance={onboardingAdvance}
              onDismiss={onboardingDismiss}
              searchBarRef={searchBarContainerRef}
              onFillExample={fillOnboardingExample}
            />

            {hasSearched && (
              <div className="animate-reveal flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <EditableQueryBar
                    scryfallQuery={(
                      lastSearchResult?.scryfallQuery || searchQuery
                    ).trim()}
                    confidence={lastSearchResult?.explanation?.confidence}
                    isLoading={isSearching}
                    originalQuery={originalQuery}
                    onRerun={handleRerunEditedQuery}
                    onRegenerate={handleRegenerateTranslation}
                    onReportIssue={() => setReportDialogOpen(true)}
                    validationError={
                      lastSearchResult?.validationIssues?.length
                        ? lastSearchResult.validationIssues.join(' • ')
                        : null
                    }
                  />
                </div>
                <div className="pt-[26px]">
                  <SaveSearchButton
                    naturalQuery={originalQuery}
                    scryfallQuery={
                      lastSearchResult?.scryfallQuery || searchQuery
                    }
                    filters={activeFilters}
                  />
                </div>
              </div>
            )}

            {/* Explain panel — hidden on mobile */}
            {hasSearched && (
              <div className="hidden sm:block animate-reveal">
                <ExplainCompilationPanel
                  intent={lastSearchResult?.intent || lastIntent}
                />
              </div>
            )}

            {/* Results Tabs */}
            {hasSearched && !isSearching && (
              <div className="animate-reveal">
                <ResultsTabs
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  showSimilar={showSimilarTab}
                  showDeckIdeas={showDeckIdeasTab}
                  showExplanation={showExplanationTab}
                  similarLoading={similarLoading}
                  deckIdeasLoading={deckIdeasLoading}
                />
              </div>
            )}

            {/* Toolbar row — only show for Cards tab */}
            {cards.length > 0 && !isSearching && activeTab === 'cards' && (
              <div className="animate-reveal space-y-2">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <SearchFilters
                    cards={cards}
                    onFilteredCards={handleFilteredCards}
                    totalCards={totalCards}
                    resetKey={filtersResetKey}
                    initialFilters={initialUrlFilters}
                    collectionLookup={user ? collectionLookup : undefined}
                  />
                  <ViewToggle value={viewMode} onChange={setViewMode} />

                  {/* Compare mode toggle */}
                  <button
                    onClick={() => {
                      setCompareMode((m) => !m);
                      if (compareMode) clearCompare();
                    }}
                    className={`flex items-center gap-1 py-1 px-2.5 text-xs rounded-md transition-colors ${
                      compareMode
                        ? 'bg-primary/10 text-primary border border-primary/30'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                    aria-pressed={compareMode}
                    aria-label={t('compare.label')}
                  >
                    <GitCompareArrows className="h-3.5 w-3.5" />
                    <span>{t('compare.label')}</span>
                  </button>

                  <div className="flex-1" />

                  {totalCards > 0 && (
                    <span
                      className="text-[11px] sm:text-xs text-muted-foreground tabular-nums flex-shrink-0"
                      role="status"
                      aria-live="polite"
                    >
                      {t('a11y.cardsCount').replace(
                        '{count}',
                        totalCards.toLocaleString(),
                      )}
                    </span>
                  )}
                  <ShareSearchButton />
                  <ExportResults cards={displayCards} />
                  <ResultsStats cards={displayCards} />
                </div>
              </div>
            )}

            {/* Similar searches — hidden on mobile */}
            {hasSearched && !isSearching && activeTab === 'cards' && (
              <div className="hidden sm:block">
                <SimilarSearches
                  originalQuery={originalQuery}
                  onSuggestionClick={handleTryExample}
                />
              </div>
            )}
          </div>

          {/* Tab content area */}
          <div className="mt-3 sm:mt-6 container-main">
            {/* Cards tab */}
            {activeTab === 'cards' && (
              <>
                {cards.length > 0 ? (
                  <>
                    {displayCards.length > 0 ? (
                      viewMode === 'grid' &&
                      displayCards.length >
                        CLIENT_CONFIG.VIRTUALIZATION_THRESHOLD ? (
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
                        displayCards.length <=
                        CLIENT_CONFIG.VIRTUALIZATION_THRESHOLD
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
                    onTrySuggestion={handleTrySuggestion}
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
                  similarityData?.sourceCard ??
                  (cards.length > 0 && cards.length <= 5 ? cards[0] : null)
                }
                isLoading={isSearching}
              />
            )}
          </div>
        </main>

        {!hasSearched && <HomeDiscoverySection onSearch={handleTryExample} />}

        <Footer />
        <ScrollToTop threshold={800} />

        {selectedCard && (
          <Suspense
            fallback={
              <div className="sr-only" role="status">
                Loading card details…
              </div>
            }
          >
            <CardModal
              card={selectedCard}
              open={true}
              onClose={() => setSelectedCard(null)}
            />
          </Suspense>
        )}

        {lightboxIndex !== null && displayCards.length > 0 && (
          <ArtLightbox
            cards={displayCards}
            initialIndex={lightboxIndex}
            onClose={closeLightbox}
          />
        )}

        <ReportIssueDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          originalQuery={originalQuery}
          compiledQuery={lastSearchResult?.scryfallQuery || searchQuery}
          filters={activeFilters}
          requestId={currentRequestId || undefined}
        />

        <CompareBar
          cards={compareCards}
          onRemove={removeCompareCard}
          onClear={clearCompare}
          onCompare={openCompare}
        />
        <CompareModal
          cards={compareCards}
          open={compareOpen}
          onClose={closeCompare}
        />

        <PwaInstallBanner />
      </div>
    </ErrorBoundary>
  );
};

export default Index;
