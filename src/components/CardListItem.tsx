/**
 * Compact list row for a single card.
 * Used in "list" view mode as an alternative to the card grid.
 */

import { memo } from 'react';
import type { KeyboardEvent } from 'react';
import type { ScryfallCard } from '@/types/card';
import { ManaCost } from '@/components/ManaSymbol';
import { getLocalizedName, getLocalizedTypeLine } from '@/lib/scryfall/localized';
import { useTranslation } from '@/lib/i18n';

interface CardListItemProps {
  card: ScryfallCard;
  onClick: () => void;
  tabIndex?: number;
}

export const CardListItem = memo(function CardListItem({
  card,
  onClick,
  tabIndex = 0,
}: CardListItemProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  const price = card.prices?.usd ? `$${card.prices.usd}` : '';
  const manaCost = card.mana_cost || card.card_faces?.[0]?.mana_cost || '';
  const { locale } = useTranslation();
  const displayName = getLocalizedName(card, locale);
  const displayType = getLocalizedTypeLine(card, locale);

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={tabIndex}
      className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/50 hover:border-border cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`View details for ${displayName}`}
    >
      {/* Name */}
      <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">
        {displayName}
      </span>

      {/* Mana cost */}
      {manaCost && (
        <span className="hidden sm:flex flex-shrink-0">
          <ManaCost cost={manaCost} size="sm" />
        </span>
      )}

      {/* Type */}
      <span className="hidden md:block text-xs text-muted-foreground truncate max-w-[180px] flex-shrink-0">
        {displayType}
      </span>

      {/* Rarity */}
      <span className="hidden lg:block text-xs text-muted-foreground capitalize flex-shrink-0 w-16 text-center">
        {card.rarity}
      </span>

      {/* Price */}
      {price && (
        <span className="text-xs font-medium text-foreground flex-shrink-0 w-14 text-right">
          {price}
        </span>
      )}
    </div>
  );
});
