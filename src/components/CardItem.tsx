/**
 * Card item component for displaying a single card in the search results grid.
 * Memoized to prevent unnecessary re-renders in large lists.
 * Shows card image with an info overlay on hover/focus for quick details.
 */

import { memo, useState, useCallback } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import type { ScryfallCard } from '@/types/card';
import { getCardImage } from '@/lib/scryfall/client';
import { getTCGPlayerUrl } from '@/lib/scryfall/printings';
import { ManaCost } from '@/components/ManaSymbol';
import { PriceSparkline, type SparklinePoint } from '@/components/PriceSparkline';
import { cardNameToSlug } from '@/lib/card-slug';
import { ShoppingCart } from 'lucide-react';
import {
  getLocalizedName,
  getLocalizedTypeLine,
} from '@/lib/scryfall/localized';
import { useTranslation } from '@/lib/i18n';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAffiliateConfig, wrapAffiliateUrl } from '@/hooks/useAffiliateConfig';

interface CardItemProps {
  card: ScryfallCard;
  onClick: () => void;
  tabIndex?: number;
  isOwned?: boolean;
  sparklineData?: SparklinePoint[];
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
  sparklineData,
}: CardItemProps) {
  const imageUrl = getCardImage(card, 'normal');
  const [imgError, setImgError] = useState(false);
  const { locale } = useTranslation();
  const displayName = getLocalizedName(card, locale);
  const displayType = getLocalizedTypeLine(card, locale);
  const { trackAffiliateClick } = useAnalytics();
  const { tcgplayerAffiliateBase } = useAffiliateConfig();

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  const manaCost = getManaCost(card);
  const price = formatPrice(card);

  const handleBuyClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      const url = getTCGPlayerUrl(card);
      const finalUrl = tcgplayerAffiliateBase
        ? wrapAffiliateUrl(url, tcgplayerAffiliateBase)
        : url;

      trackAffiliateClick({
        affiliate: 'tcgplayer',
        card_name: card.name,
        card_id: card.id,
        set_code: card.set,
        is_affiliate_link: !!tcgplayerAffiliateBase,
        price_usd: card.prices?.usd || undefined,
      });

      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    },
    [card, tcgplayerAffiliateBase, trackAffiliateClick],
  );

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
          <span className="text-sm text-muted-foreground font-medium">
            {displayName}
          </span>
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
        <div
          className="absolute top-1.5 left-1.5 z-10 h-5 w-5 rounded-full bg-emerald-500/90 flex items-center justify-center shadow-sm"
          aria-label="Owned"
        >
          <svg
            className="h-3 w-3 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {/* Info overlay — always visible on mobile, hover on desktop */}
      <div
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent pt-6 sm:pt-8 pb-1.5 sm:pb-2 px-2 sm:px-2.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100 transition-opacity duration-200 pointer-events-none"
        aria-hidden="true"
      >
        <div className="flex items-end justify-between gap-1">
          <div className="min-w-0 flex-1">
            <Link
              to={`/cards/${cardNameToSlug(card.name)}`}
              className="text-[10px] sm:text-[11px] leading-tight font-semibold text-white truncate hover:underline pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
              title={`View ${displayName} off-meta alternatives`}
            >
              {displayName}
            </Link>
            <p className="text-[9px] sm:text-[10px] leading-tight text-white/70 truncate mt-0.5 hidden min-[480px]:block">
              {displayType}
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            {manaCost && (
              <ManaCost cost={manaCost} size="sm" className="drop-shadow" />
            )}
            {price && (
              <div className="flex items-center gap-1">
                {sparklineData && sparklineData.length >= 2 && (
                  <PriceSparkline data={sparklineData} width={36} height={14} />
                )}
                <button
                  onClick={handleBuyClick}
                  className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-medium text-emerald-300 tabular-nums hover:text-emerald-200 transition-colors pointer-events-auto"
                  aria-label={`Buy ${displayName} for ${price}`}
                  title={`Buy on TCGplayer for ${price}`}
                >
                  <ShoppingCart className="h-2.5 w-2.5" />
                  {price}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
