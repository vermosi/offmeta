/**
 * Virtualized card grid component using @tanstack/react-virtual.
 * Only renders visible cards to dramatically reduce DOM nodes for large result sets.
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { CardItem } from '@/components/CardItem';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { ScryfallCard } from '@/types/card';

/** Track which card index has keyboard focus within the grid */
function useGridKeyboardNav(
  cards: ScryfallCard[],
  columns: number,
  onCardClick: (card: ScryfallCard, index: number) => void,
) {
  const [focusIndex, setFocusIndex] = useState(-1);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (cards.length === 0) return;

      let next = focusIndex;
      switch (e.key) {
        case 'ArrowRight':
          next = Math.min(focusIndex + 1, cards.length - 1);
          break;
        case 'ArrowLeft':
          next = Math.max(focusIndex - 1, 0);
          break;
        case 'ArrowDown':
          next = Math.min(focusIndex + columns, cards.length - 1);
          break;
        case 'ArrowUp':
          next = Math.max(focusIndex - columns, 0);
          break;
        case 'Enter':
        case ' ':
          if (focusIndex >= 0 && focusIndex < cards.length) {
            e.preventDefault();
            onCardClick(cards[focusIndex], focusIndex);
          }
          return;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = cards.length - 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      setFocusIndex(next);
    },
    [focusIndex, cards, columns, onCardClick],
  );

  // Focus the active card element when focusIndex changes
  useEffect(() => {
    if (focusIndex < 0) return;
    const el = document.querySelector<HTMLElement>(
      `[data-testid="virtualized-grid"] [data-card-index="${focusIndex}"]`,
    );
    el?.focus();
  }, [focusIndex]);

  return { focusIndex, setFocusIndex, handleKeyDown };
}

interface VirtualizedCardGridProps {
  cards: ScryfallCard[];
  onCardClick: (card: ScryfallCard, index: number) => void;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  isFetchNextPageError?: boolean;
  error?: Error | null;
  isError?: boolean;
  onRetry?: () => void;
}

const CARD_ASPECT_RATIO = 2.5 / 3.5;
// Max card width to prevent cards from growing too large when filtering
const MAX_CARD_WIDTH = 280;

const BREAKPOINTS = [
  { minWidth: 1280, columns: 5, gap: 24 }, // xl+ (keeps cards edge-aligned on wide screens)
  { minWidth: 1024, columns: 4, gap: 24 }, // lg
  { minWidth: 768, columns: 3, gap: 20 },  // md
  { minWidth: 0, columns: 2, gap: 16 },    // mobile
];

function buildVirtualizedRowKey(
  cards: ScryfallCard[],
  columns: number,
  cardHeight: number,
  gap: number,
  index: number,
): string {
  const startIndex = index * columns;
  const rowCardIds = cards
    .slice(startIndex, startIndex + columns)
    .map((card) => card.id)
    .join('|');

  return `${columns}-${cardHeight}-${gap}-${index}-${rowCardIds}`;
}

export function VirtualizedCardGrid({
  cards,
  onCardClick,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  error,
  isError,
  onRetry,
}: VirtualizedCardGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ columns: 4, cardWidth: 200, gap: 16 });
  const [scrollMargin, setScrollMargin] = useState(0);

  const { focusIndex, setFocusIndex, handleKeyDown } = useGridKeyboardNav(
    cards,
    dimensions.columns,
    onCardClick,
  );

  // Calculate columns based on breakpoints (not auto-fill)
  // Card width is capped to MAX_CARD_WIDTH so filtering doesn't resize cards
  const updateDimensions = useCallback(() => {
    if (!parentRef.current) return;
    const containerWidth = parentRef.current.clientWidth;

    // Find matching breakpoint
    const breakpoint =
      BREAKPOINTS.find((bp) => containerWidth >= bp.minWidth) ||
      BREAKPOINTS[BREAKPOINTS.length - 1];
    const columns = breakpoint.columns;
    const gap = breakpoint.gap;
    // Calculate fluid width but cap it
    const fluidWidth = (containerWidth - gap * (columns - 1)) / columns;
    const cardWidth = Math.min(fluidWidth, MAX_CARD_WIDTH);
    setDimensions({ columns, cardWidth, gap });
  }, []);

  // Update on mount and resize
  useEffect(() => {
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    if (parentRef.current) {
      observer.observe(parentRef.current);
    }
    return () => observer.disconnect();
  }, [updateDimensions]);

  // Keep scroll margin in sync with layout so window-virtualization aligns correctly.
  useEffect(() => {
    const updateScrollMargin = () => {
      setScrollMargin(parentRef.current?.offsetTop ?? 0);
    };

    updateScrollMargin();
    window.addEventListener('resize', updateScrollMargin);
    return () => window.removeEventListener('resize', updateScrollMargin);
  }, []);

  const { columns, cardWidth, gap } = dimensions;
  const { t } = useTranslation();
  // Use ceil to avoid underestimated row heights (which can cause overlap).
  const cardHeight = Math.ceil(cardWidth / CARD_ASPECT_RATIO);
  const rowHeight = cardHeight + gap;
  const rowCount = Math.ceil(cards.length / columns);
  const showLoadMoreRow =
    cards.length > 0 && (hasNextPage || isFetchingNextPage || isError);
  const virtualRowCount = showLoadMoreRow ? rowCount + 1 : rowCount;
  const loadMoreRowHeight = Math.max(rowHeight, 120);

  const rowVirtualizer = useWindowVirtualizer({
    count: virtualRowCount,
    estimateSize: (index) =>
      showLoadMoreRow && index === rowCount ? loadMoreRowHeight : rowHeight,
    overscan: 3,
    scrollMargin,
    getItemKey: (index) =>
      showLoadMoreRow && index === rowCount
        ? `load-more-${isError ? 'error' : isFetchingNextPage ? 'loading' : 'ready'}`
        : buildVirtualizedRowKey(cards, columns, cardHeight, gap, index),
  });

  // Load more when near bottom (but not when the error row is showing — user must retry)
  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    if (virtualItems.length === 0) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (
      lastItem.index >= rowCount - 2 &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isError &&
      onLoadMore
    ) {
      onLoadMore();
    }
  }, [rowVirtualizer, rowCount, hasNextPage, isFetchingNextPage, isError, onLoadMore]);

  return (
    <div
      ref={parentRef}
      className="w-full"
      role="grid"
      aria-label="Search results"
      aria-rowcount={virtualRowCount}
      data-testid="virtualized-grid"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          if (showLoadMoreRow && virtualRow.index === rowCount) {
            return (
              <div
                key={virtualRow.key}
                role="row"
                aria-rowindex={virtualRow.index + 1}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${loadMoreRowHeight}px`,
                  paddingBottom: `${gap}px`,
                  boxSizing: 'border-box',
                  transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                }}
                className="flex items-center justify-center"
              >
                <div className="w-full max-w-2xl" role="status" aria-live="polite">
                  {isError ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-4 text-center">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-5 w-5" aria-hidden="true" />
                        <span className="font-medium">
                          {t('results.loadMoreErrorTitle', "Couldn't load more cards")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t(
                          'results.loadMoreErrorDescription',
                          'This is usually a temporary Scryfall connection issue.',
                        )}
                      </p>
                      {onRetry && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={onRetry}
                          className="gap-2"
                          aria-label={t('results.retryButton', 'Try again')}
                        >
                          <RefreshCw className="h-4 w-4" aria-hidden="true" />
                          {t('results.retryButton', 'Try again')}
                        </Button>
                      )}
                    </div>
                  ) : isFetchingNextPage ? (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                      <span>{t('results.loadingMore', 'Loading more cards...')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <span className="text-sm">
                        {t('results.scrollToLoad', 'Scroll to load more')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          const startIndex = virtualRow.index * columns;

          return (
            <div
              key={virtualRow.key}
              role="row"
              aria-rowindex={virtualRow.index + 1}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${rowHeight}px`,
                paddingBottom: `${gap}px`,
                boxSizing: 'border-box',
                transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, minmax(0, ${cardWidth}px))`,
                // When cards hit their max width, spread them edge-to-edge so the
                // first/last columns line up with the toolbar's container padding.
                justifyContent: cardWidth >= MAX_CARD_WIDTH ? 'space-between' : 'center',
                gap: `${gap}px`,
              }}
            >
              {Array.from({ length: columns }).map((_, colIndex) => {
                const cardIndex = startIndex + colIndex;
                const card = cards[cardIndex];

                if (!card) return <div key={`empty-${colIndex}`} role="gridcell" aria-hidden="true" />;

                const isFocused = focusIndex === cardIndex;

                return (
                  <div
                    key={card.id}
                    role="gridcell"
                    data-card-index={cardIndex}
                    tabIndex={isFocused ? 0 : -1}
                    onClick={() => {
                      setFocusIndex(cardIndex);
                      onCardClick(card, cardIndex);
                    }}
                    onFocus={() => setFocusIndex(cardIndex)}
                    className="outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
                  >
                    <CardItem
                      card={card}
                      onClick={() => onCardClick(card, cardIndex)}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
