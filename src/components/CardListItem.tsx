/**
 * Compact list row for a single card.
 * Used in "list" view mode as an alternative to the card grid.
 */

import { memo } from 'react';
import type { KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import type { ScryfallCard } from '@/types/card';
import { ManaCost } from '@/components/ManaSymbol';
import {
  PriceSparkline,
  type SparklinePoint,
} from '@/components/PriceSparkline';
import { cardNameToSlug } from '@/lib/card-slug';
import { Search } from 'lucide-react';
import {
  getLocalizedName,
  getLocalizedTypeLine,
} from '@/lib/scryfall/localized';
import { useTranslation } from '@/lib/i18n';
import type { WhyItMatches as WhyItMatchesReport } from '@/lib/search/whyItMatches';

interface CardListItemProps {
  card: ScryfallCard;
  onClick: () => void;
  onSearchSimilar?: (cardName: string) => void;
  tabIndex?: number;
  isOwned?: boolean;
  sparklineData?: SparklinePoint[];
  /** Deterministic report explaining why this card matched the current query. */
  whyReport?: WhyItMatchesReport | null;
}

export const CardListItem = memo(function CardListItem({
  card,
  onClick,
  onSearchSimilar,
  tabIndex = 0,
  isOwned,
  sparklineData,
  whyReport,
}: CardListItemProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  const price = card.prices?.usd ? `$${card.prices.usd}` : '';
  const manaCost = card.mana_cost || card.card_faces?.[0]?.mana_cost || '';
  const { locale, t } = useTranslation();
  const displayName = getLocalizedName(card, locale);
  const displayType = getLocalizedTypeLine(card, locale);

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={tabIndex}
      data-testid="search-result-card"
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/50 bg-card/60 hover:bg-card/80 hover:border-border cursor-pointer transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={t('card.viewDetailsAria', 'View details for {name}', { name: displayName })}
    >
      {/* Owned indicator */}
      {isOwned && (
        <span
          className="h-4 w-4 rounded-full bg-success/90 flex items-center justify-center shrink-0"
          aria-label={t('card.ownedAria', 'Owned')}
        >
          <svg
            className="h-2.5 w-2.5 text-success-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}

      {/* Name + why it matches */}
      <span className="flex-1 min-w-0">
        <Link
          to={`/cards/${cardNameToSlug(card.name)}`}
          className="block truncate text-sm font-medium text-foreground transition-colors hover:text-primary"
          onClick={(e) => e.stopPropagation()}
          title={t('card.viewAlternativesTitle', 'View {name} off-meta alternatives', { name: displayName })}
        >
          {displayName}
        </Link>
        {whyReport && (
          <span
            className="mt-0.5 block truncate font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground"
            title={whyReport.summary ?? undefined}
          >
            {[
              whyReport.concept,
              whyReport.directness === 'direct'
                ? t('whyItMatches.direct', 'Direct')
                : t('whyItMatches.structural', 'Structural'),
              whyReport.method
                ? t(
                    `whyItMatches.methodValue.${whyReport.method}`,
                    whyReport.method.replace(/_/g, ' '),
                  )
                : null,
            ]
              .filter(Boolean)
              .join(' / ')}
          </span>
        )}
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

      {/* Sparkline */}
      {sparklineData && sparklineData.length >= 2 && (
        <span className="hidden sm:flex flex-shrink-0">
          <PriceSparkline data={sparklineData} width={48} height={16} />
        </span>
      )}

      {/* Price */}
      {price && (
        <span className="text-xs font-medium text-foreground flex-shrink-0 w-14 text-right">
          {price}
        </span>
      )}

      {onSearchSimilar && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSearchSimilar(card.name);
          }}
        className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/70 px-2 py-1 text-[10px] font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent/10"
        aria-label={t('card.searchSimilarAria', 'Search cards similar to {name}', { name: displayName })}
        title={t('card.searchSimilarAria', 'Search cards similar to {name}', { name: displayName })}
      >
          <Search className="h-3 w-3 text-accent" aria-hidden="true" />
          {t('card.similarButton', 'Similar')}
        </button>
      )}
    </div>
  );
});
