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
  tabIndex?: number;
  isOwned?: boolean;
}

export const CardImageItem = memo(function CardImageItem({
  card,
  onClick,
  tabIndex = 0,
  isOwned,
}: CardImageItemProps) {
  const imageUrl = getCardImage(card, 'normal');
  const { locale } = useTranslation();
  const displayName = getLocalizedName(card, locale);
  return (
    <button
      onClick={onClick}
      tabIndex={tabIndex}
      className="relative aspect-[2.5/3.5] rounded-lg overflow-hidden bg-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-transform duration-200 hover:scale-[1.03] w-full"
      aria-label={`View ${displayName}`}
    >
      {isOwned && (
        <div className="absolute top-1.5 left-1.5 z-10 h-5 w-5 rounded-full bg-emerald-500/90 flex items-center justify-center shadow-sm" aria-label="Owned">
          <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
      )}
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
