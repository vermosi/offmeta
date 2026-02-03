/**
 * Virtualized card grid component using @tanstack/react-virtual.
 * Only renders visible cards to dramatically reduce DOM nodes for large result sets.
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { CardItem } from '@/components/CardItem';
import type { ScryfallCard } from '@/types/card';

interface VirtualizedCardGridProps {
  cards: ScryfallCard[];
  onCardClick: (card: ScryfallCard, index: number) => void;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

const GAP = 16;
// Magic card aspect ratio: width / height = 2.5 / 3.5 ≈ 0.714
const CARD_ASPECT_RATIO = 2.5 / 3.5;
// Max card width to prevent cards from growing too large when filtering
const MAX_CARD_WIDTH = 280;

// Responsive column breakpoints (max 4 columns)
const BREAKPOINTS = [
  { minWidth: 1024, columns: 4 }, // lg+
  { minWidth: 768, columns: 3 }, // md
  { minWidth: 480, columns: 2 }, // sm
  { minWidth: 0, columns: 1 }, // xs/mobile
];

export function VirtualizedCardGrid({
  cards,
  onCardClick,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
}: VirtualizedCardGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ columns: 4, cardWidth: 200 });
  const [scrollMargin, setScrollMargin] = useState(0);

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
    // Calculate fluid width but cap it
    const fluidWidth = (containerWidth - GAP * (columns - 1)) / columns;
    const cardWidth = Math.min(fluidWidth, MAX_CARD_WIDTH);
    setDimensions({ columns, cardWidth });
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

  const { columns, cardWidth } = dimensions;
  // Use ceil to avoid underestimated row heights (which can cause overlap).
  const cardHeight = Math.ceil(cardWidth / CARD_ASPECT_RATIO);
  const rowHeight = cardHeight + GAP;
  const rowCount = Math.ceil(cards.length / columns);

  // Use a key to force virtualizer re-creation when layout changes
  const virtualizerKey = `${columns}-${cardHeight}`;

  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => rowHeight,
    overscan: 3,
    scrollMargin,
    // This ensures rows are re-measured when size changes
    getItemKey: (index) => `${virtualizerKey}-${index}`,
  });

  // Load more when near bottom
  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    if (virtualItems.length === 0) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (
      lastItem.index >= rowCount - 2 &&
      hasNextPage &&
      !isFetchingNextPage &&
      onLoadMore
    ) {
      onLoadMore();
    }
  }, [rowVirtualizer, rowCount, hasNextPage, isFetchingNextPage, onLoadMore]);

  return (
    <div
      ref={parentRef}
      className="w-full"
      role="list"
      aria-label="Search results"
      data-testid="virtualized-grid"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns;

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${rowHeight}px`,
                paddingBottom: `${GAP}px`,
                boxSizing: 'border-box',
                transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: `${GAP}px`,
              }}
            >
              {Array.from({ length: columns }).map((_, colIndex) => {
                const cardIndex = startIndex + colIndex;
                const card = cards[cardIndex];

                if (!card) return <div key={`empty-${colIndex}`} />;

                return (
                  <CardItem
                    key={card.id}
                    card={card}
                    onClick={() => onCardClick(card, cardIndex)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
