/**
 * Horizontal strip of discovery-based related cards shown below search results.
 * Fetches relationships for the top result card using the discovery service.
 * Lightweight and non-intrusive — collapses to nothing if no data.
 * @module components/RelatedCardsStrip
 */

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ManaCost } from '@/components/ManaSymbol';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useTranslation } from '@/lib/i18n';
import { getRelatedCards } from '@/services/discovery';
import { getRelationshipLabel } from '@/lib/relationships/ranking';
import type { RankedRelationship } from '@/lib/relationships/ranking';
import type { ScryfallCard } from '@/types/card';

interface RelatedCardsStripProps {
  /** The top card from search results to base discovery on */
  sourceCard: ScryfallCard | null;
  /** Called when user clicks a related card name (to trigger a new search) */
  onCardClick?: (cardName: string) => void;
}

export function RelatedCardsStrip({ sourceCard, onCardClick }: RelatedCardsStripProps) {
  const { t } = useTranslation();
  const [recs, setRecs] = useState<RankedRelationship[]>([]);
  const [loading, setLoading] = useState(false);
  const [oracleId, setOracleId] = useState<string | undefined>();

  // Extract oracle_id from the source card
  useEffect(() => {
    const id = sourceCard?.oracle_id;
    if (id && id !== oracleId) {
      setOracleId(id);
    } else if (!sourceCard) {
      setOracleId(undefined);
      setRecs([]);
    }
  }, [sourceCard, oracleId]);

  useEffect(() => {
    if (!oracleId) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const results = await getRelatedCards(oracleId, { limit: 8 });
        if (!cancelled) setRecs(results);
      } catch {
        if (!cancelled) setRecs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [oracleId]);

  const handleClick = useCallback(
    (cardName: string) => {
      onCardClick?.(cardName);
    },
    [onCardClick],
  );

  // Don't render anything if no data and not loading
  if (!oracleId) return null;
  if (!loading && recs.length === 0) return null;

  return (
    <section className="mt-6 sm:mt-8" aria-label="Related cards">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-accent flex-shrink-0" />
        <h3 className="text-sm font-semibold text-foreground">
          {t('discovery.relatedCards', 'Related Cards')}
        </h3>
        {sourceCard && (
          <span className="text-xs text-muted-foreground truncate">
            {t('discovery.basedOn', 'based on')} {sourceCard.name}
          </span>
        )}
        <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto flex-shrink-0" />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {t('discovery.loading', 'Finding related cards…')}
          </span>
        </div>
      ) : (
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-3">
            {recs.map((rec) => (
              <button
                key={rec.oracleId}
                type="button"
                className="group flex-shrink-0 w-[120px] sm:w-[140px] flex flex-col items-center gap-1.5 rounded-lg p-2 border border-border/40 bg-card/50 hover:bg-secondary/60 hover:border-border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => handleClick(rec.cardName)}
                title={`${rec.cardName} — ${getRelationshipLabel(rec.relationshipType)}`}
              >
                {rec.imageUrl ? (
                  <img
                    src={rec.imageUrl}
                    alt={rec.cardName}
                    className="w-full aspect-[2.5/3.5] rounded object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-[2.5/3.5] rounded bg-secondary flex items-center justify-center">
                    <span className="text-[9px] text-muted-foreground text-center line-clamp-2 px-1">
                      {rec.cardName}
                    </span>
                  </div>
                )}

                <span className="text-[11px] text-foreground leading-tight text-center line-clamp-1 w-full font-medium">
                  {rec.cardName}
                </span>

                {rec.manaCost && (
                  <ManaCost cost={rec.manaCost} size="sm" />
                )}

                <Badge
                  variant="secondary"
                  className="text-[9px] px-1.5 py-0 whitespace-nowrap"
                >
                  {getRelationshipLabel(rec.relationshipType)}
                </Badge>
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </section>
  );
}
