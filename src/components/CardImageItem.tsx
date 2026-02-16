/**
 * Image-only gallery view for search results.
 * Shows card art in a tight grid without text.
 */

import { memo } from 'react';
import type { ScryfallCard } from '@/types/card';
import { getCardImage } from '@/lib/scryfall/client';
import { getLocalizedName } from '@/lib/scryfall/localized';
import { useTranslation } from '@/lib/i18n';

interface CardImageItemProps {
  card: ScryfallCard;
  onClick: () => void;
}

export const CardImageItem = memo(function CardImageItem({
  card,
  onClick,
}: CardImageItemProps) {
  const imageUrl = getCardImage(card, 'normal');
  const { locale } = useTranslation();
  const displayName = getLocalizedName(card, locale);
  return (
    <button
      onClick={onClick}
      className="relative aspect-[2.5/3.5] rounded-lg overflow-hidden bg-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-transform duration-200 hover:scale-[1.03] w-full"
      aria-label={`View ${displayName}`}
    >
      <img
        src={imageUrl}
        alt={displayName}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover"
      />
    </button>
  );
});
