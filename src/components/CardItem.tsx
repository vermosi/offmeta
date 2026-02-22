/**
 * Card item component for displaying a single card in the search results grid.
 * Memoized to prevent unnecessary re-renders in large lists.
 * Shows card image with an info overlay on hover/focus for quick details.
 */

import { memo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { ScryfallCard } from '@/types/card';
import { getCardImage } from '@/lib/scryfall/client';
import { ManaCost } from '@/components/ManaSymbol';
import { getLocalizedName, getLocalizedTypeLine } from '@/lib/scryfall/localized';
import { useTranslation } from '@/lib/i18n';

interface CardItemProps {
  card: ScryfallCard;
  onClick: () => void;
  tabIndex?: number;
  isOwned?: boolean;
}

/** Format a price string to a compact display. */
function formatPrice(card: ScryfallCard): string | null {
  const usd = card.prices?.usd ?? card.prices?.usd_foil;
  if (usd) return `$${usd}`;
  const eur = card.prices?.eur ?? card.prices?.eur_foil;
  if (eur) return `€${eur}`;
  return null;
}

/** Get the mana cost, handling double-faced cards. */
function getManaCost(card: ScryfallCard): string | undefined {
  return card.mana_cost || card.card_faces?.[0]?.mana_cost;
}

export const CardItem = memo(function CardItem({
  card,
  onClick,
  tabIndex = 0,
  isOwned,
}: CardItemProps) {
  const imageUrl = getCardImage(card, 'normal');
  const [imgError, setImgError] = useState(false);
  const { locale } = useTranslation();
  const displayName = getLocalizedName(card, locale);
  const displayType = getLocalizedTypeLine(card, locale);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  const manaCost = getManaCost(card);
  const price = formatPrice(card);

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={tabIndex}
      className="group relative w-full aspect-[2.5/3.5] rounded-xl overflow-hidden bg-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-transform duration-200 hover:scale-[1.02]"
      aria-label={`View details for ${displayName}`}
    >
      {imgError ? (
        <div className="w-full h-full flex items-center justify-center p-4 text-center">
          <span className="text-sm text-muted-foreground font-medium">{displayName}</span>
        </div>
      ) : (
          <img
          src={imageUrl}
          alt={displayName}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      )}

      {/* Owned badge */}
      {isOwned && (
        <div className="absolute top-1.5 left-1.5 z-10 h-5 w-5 rounded-full bg-emerald-500/90 flex items-center justify-center shadow-sm" aria-label="Owned">
          <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
      )}

      {/* Info overlay — always visible on mobile, hover on desktop */}
      <div
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent pt-6 sm:pt-8 pb-1.5 sm:pb-2 px-2 sm:px-2.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100 transition-opacity duration-200 pointer-events-none"
        aria-hidden="true"
      >
        <div className="flex items-end justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] leading-tight font-semibold text-white truncate">
              {displayName}
            </p>
            <p className="text-[9px] sm:text-[10px] leading-tight text-white/70 truncate mt-0.5 hidden min-[480px]:block">
              {displayType}
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            {manaCost && (
              <ManaCost cost={manaCost} size="sm" className="drop-shadow" />
            )}
            {price && (
              <span className="text-[9px] sm:text-[10px] font-medium text-emerald-300 tabular-nums">
                {price}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
