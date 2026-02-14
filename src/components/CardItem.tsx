/**
 * Card item component for displaying a single card in the search results grid.
 * Memoized to prevent unnecessary re-renders in large lists.
 * Simple, clean display - click for details like Scryfall.
 */

import { memo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { ScryfallCard } from '@/types/card';
import { getCardImage } from '@/lib/scryfall/client';

interface CardItemProps {
  card: ScryfallCard;
  onClick: () => void;
}

export const CardItem = memo(function CardItem({
  card,
  onClick,
}: CardItemProps) {
  const imageUrl = getCardImage(card, 'normal');
  const [imgError, setImgError] = useState(false);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className="relative w-full max-w-[280px] mx-auto aspect-[2.5/3.5] rounded-xl overflow-hidden bg-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-transform duration-200 hover:scale-[1.02]"
      aria-label={`View details for ${card.name}`}
    >
      {imgError ? (
        <div className="w-full h-full flex items-center justify-center p-4 text-center">
          <span className="text-sm text-muted-foreground font-medium">{card.name}</span>
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={card.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
});
