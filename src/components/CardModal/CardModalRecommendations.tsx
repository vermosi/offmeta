/**
 * "You Might Also Like" panel in CardModal.
 * Uses the discovery service for co-occurrence-based recommendations.
 * Shows relationship type labels and normalized strength indicators.
 * Includes filter tabs for relationship types.
 * @module components/CardModal/CardModalRecommendations
 */

import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ManaCost } from '@/components/ManaSymbol';
import { useTranslation } from '@/lib/i18n';
import { getRelatedCards } from '@/services/discovery';
import { getRelationshipLabel } from '@/lib/relationships/ranking';
import type { RankedRelationship } from '@/lib/relationships/ranking';
import type { RelationshipType } from '@/lib/relationships/scoring';

interface CardModalRecommendationsProps {
  oracleId: string | undefined;
  cardName: string;
  onCardClick?: (cardName: string) => void;
  isMobile?: boolean;
}

const FILTER_TABS: { key: 'all' | RelationshipType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'co_played', label: 'Played With' },
  { key: 'similar_role', label: 'Similar Role' },
  { key: 'budget_alternative', label: 'Budget Alt' },
];

export function CardModalRecommendations({
  oracleId,
  cardName: _cardName,
  onCardClick,
  isMobile: _isMobile,
}: CardModalRecommendationsProps) {
  const { t } = useTranslation();
  const [recs, setRecs] = useState<RankedRelationship[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | RelationshipType>('all');

  useEffect(() => {
    if (!oracleId) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    setActiveFilter('all');

    (async () => {
      try {
        const results = await getRelatedCards(oracleId, { limit: 20 });
        if (!cancelled) setRecs(results);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [oracleId]);

  const filteredRecs = useMemo(() => {
    if (activeFilter === 'all') return recs.slice(0, 6);
    return recs.filter((r) => r.relationshipType === activeFilter).slice(0, 6);
  }, [recs, activeFilter]);

  // Compute which tabs have data to show
  const availableTypes = useMemo(() => {
    const types = new Set(recs.map((r) => r.relationshipType));
    return types;
  }, [recs]);

  if (!oracleId) return null;
  if (!loading && !error && recs.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">
          {t('cardModal.youMightAlsoLike', 'You Might Also Like')}
        </h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-xs text-muted-foreground italic">
          {t('cardModal.recsUnavailable', 'Recommendations unavailable')}
        </p>
      ) : (
        <>
          {/* Filter tabs — only show if we have more than one type */}
          {availableTypes.size > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {FILTER_TABS.map((tab) => {
                const isActive = activeFilter === tab.key;
                const hasData = tab.key === 'all' || availableTypes.has(tab.key as RelationshipType);
                if (!hasData) return null;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveFilter(tab.key)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {filteredRecs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              {t('cardModal.noRecsForFilter', 'No recommendations for this filter')}
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {filteredRecs.map((rec) => (
                <button
                  key={rec.oracleId}
                  type="button"
                  className="group flex flex-col items-center gap-1 rounded-lg p-1.5 hover:bg-secondary/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => onCardClick?.(rec.cardName)}
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
                      <span className="text-[8px] text-muted-foreground text-center line-clamp-2 px-0.5">
                        {rec.cardName}
                      </span>
                    </div>
                  )}
                  <span className="text-[10px] text-muted-foreground leading-tight text-center line-clamp-1 w-full">
                    {rec.cardName}
                  </span>
                  {rec.manaCost && (
                    <ManaCost cost={rec.manaCost} size="sm" />
                  )}
                  {activeFilter === 'all' && rec.relationshipType !== 'co_played' && (
                    <Badge variant="secondary" className="text-[8px] px-1 py-0">
                      {getRelationshipLabel(rec.relationshipType)}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
