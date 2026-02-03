/**
 * Card details component for CardModal.
 * Displays name, mana cost, type line, oracle text, and badges.
 * @module components/CardModal/CardModalDetails
 */

import { ManaCost, OracleText } from '@/components/ManaSymbol';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Palette, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CardModalDetailsProps } from './types';

function getRarityVariant(rarity: string): BadgeProps['variant'] {
  switch (rarity) {
    case 'mythic':
      return 'mythic';
    case 'rare':
      return 'rare';
    case 'uncommon':
      return 'uncommon';
    case 'common':
      return 'common';
    default:
      return 'secondary';
  }
}

export function CardModalDetails({
  faceDetails,
  displaySetName,
  displayRarity,
  displayCollectorNumber,
  displayArtist,
  isReserved,
  englishPrintings,
  selectedPrintingId,
  cardId,
  isMobile = false,
}: CardModalDetailsProps) {
  // Calculate special badges
  const sortedByDate = [...englishPrintings].sort(
    (a, b) =>
      new Date(a.released_at).getTime() - new Date(b.released_at).getTime(),
  );
  const oldestId = sortedByDate[0]?.id;
  const currentId = selectedPrintingId || cardId;
  const isFirstPrinting =
    currentId === oldestId && englishPrintings.length > 1;
  const isOnlyPrinting = englishPrintings.length === 1;

  const uniqueArtists = new Set(englishPrintings.map((p) => p.artist));
  const currentArtist =
    englishPrintings.find((p) => p.id === currentId)?.artist || displayArtist;
  const artistCount = englishPrintings.filter(
    (p) => p.artist === currentArtist,
  ).length;
  const isUniqueArt =
    uniqueArtists.size > 1 && artistCount === 1 && englishPrintings.length > 1;

  return (
    <div className={cn('space-y-4', isMobile && 'text-center')}>
      {/* Name, Mana, Type */}
      <div className={cn('space-y-1.5', !isMobile && 'pr-8')}>
        <h2 className="text-lg font-semibold text-foreground tracking-tight">
          {faceDetails.name}
        </h2>
        {faceDetails.mana_cost && (
          <div className={isMobile ? 'flex justify-center' : undefined}>
            <ManaCost cost={faceDetails.mana_cost} size="md" />
          </div>
        )}
        <p className="text-sm text-muted-foreground">{faceDetails.type_line}</p>
      </div>

      {/* Badges */}
      <div
        className={cn(
          'flex items-center gap-2 flex-wrap',
          isMobile && 'justify-center',
        )}
      >
        <Badge variant={getRarityVariant(displayRarity)} className="capitalize">
          {displayRarity}
        </Badge>
        <Badge variant="secondary">
          {displaySetName}
          {displayCollectorNumber && ` #${displayCollectorNumber}`}
        </Badge>
        {isReserved && (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1"
          >
            <Shield className="h-3 w-3" />
            {isMobile ? 'Reserved' : 'Reserved List'}
          </Badge>
        )}
        {isFirstPrinting && (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
          >
            First Printing
          </Badge>
        )}
        {isOnlyPrinting && (
          <Badge
            variant="outline"
            className="bg-purple-500/10 text-purple-600 border-purple-500/30"
          >
            Only Printing
          </Badge>
        )}
        {isUniqueArt && (
          <Badge
            variant="outline"
            className="bg-pink-500/10 text-pink-600 border-pink-500/30"
          >
            Unique Art
          </Badge>
        )}
      </div>

      {/* Oracle Text */}
      {faceDetails.oracle_text && (
        <div
          className={cn(
            'space-y-1.5',
            isMobile && 'bg-muted/20 rounded-lg p-3 border border-border/30',
          )}
        >
          {!isMobile && (
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Card Text
            </h3>
          )}
          <div
            className={cn(
              'text-sm text-foreground',
              isMobile && 'leading-relaxed',
            )}
          >
            <OracleText text={faceDetails.oracle_text} size="sm" />
          </div>
        </div>
      )}

      {/* Flavor Text */}
      {faceDetails.flavor_text && (
        <div className="text-sm text-muted-foreground italic border-l-2 border-border pl-3">
          <OracleText text={faceDetails.flavor_text} size="sm" />
        </div>
      )}

      {/* Power/Toughness */}
      {(faceDetails.power || faceDetails.toughness) && (
        <div className={isMobile ? 'flex justify-center' : undefined}>
          <div
            className={cn(
              'inline-flex items-center gap-1.5 bg-muted/50 rounded-lg border border-border/50',
              isMobile ? 'px-4 py-2' : 'px-3 py-1.5',
            )}
          >
            <span
              className={cn(
                'font-semibold text-foreground',
                isMobile && 'font-bold text-lg',
              )}
            >
              {faceDetails.power}
            </span>
            <span className="text-muted-foreground">/</span>
            <span
              className={cn(
                'font-semibold text-foreground',
                isMobile && 'font-bold text-lg',
              )}
            >
              {faceDetails.toughness}
            </span>
          </div>
        </div>
      )}

      {/* Artist */}
      {displayArtist && (
        <div
          className={cn(
            'flex items-center gap-2 text-sm',
            isMobile && 'justify-center',
          )}
        >
          <Palette className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Illustrated by</span>
          <span className="text-foreground font-medium">{displayArtist}</span>
        </div>
      )}
    </div>
  );
}
