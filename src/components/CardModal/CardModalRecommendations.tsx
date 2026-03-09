/**
 * "You Might Also Like" panel in CardModal.
 * Queries the card-recommendations edge function for co-occurrence data.
 * @module components/CardModal/CardModalRecommendations
 */

import { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ManaCost } from '@/components/ManaSymbol';
import { useTranslation } from '@/lib/i18n';

interface Recommendation {
  oracle_id: string;
  card_name: string;
  cooccurrence_count: number;
  mana_cost: string | null;
  type_line: string | null;
  image_url: string | null;
}

interface CardModalRecommendationsProps {
  oracleId: string | undefined;
  cardName: string;
  onCardClick?: (cardName: string) => void;
  isMobile?: boolean;
}

export function CardModalRecommendations({
  oracleId,
  cardName,
  onCardClick,
  isMobile,
}: CardModalRecommendationsProps) {
  const { t } = useTranslation();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!oracleId) return;
    let cancelled = false;
    setLoading(true);
    setError(false);

    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke(
          'card-recommendations',
          { body: { oracle_id: oracleId, limit: 6 } },
        );
        if (fnErr) throw fnErr;
        if (!cancelled && data?.recommendations) {
          setRecs(data.recommendations);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [oracleId]);

  // Don't render if no oracle_id or empty results after loading
  if (!oracleId) return null;
  if (!loading && !error && recs.length === 0) return null;

  return (
    <div className={`space-y-3 ${isMobile ? '' : ''}`}>
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
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {recs.map((rec) => (
            <button
              key={rec.oracle_id}
              type="button"
              className="group flex flex-col items-center gap-1 rounded-lg p-1.5 hover:bg-secondary/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => onCardClick?.(rec.card_name)}
              title={rec.card_name}
            >
              {rec.image_url ? (
                <img
                  src={rec.image_url}
                  alt={rec.card_name}
                  className="w-full aspect-[2.5/3.5] rounded object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full aspect-[2.5/3.5] rounded bg-secondary flex items-center justify-center">
                  <span className="text-[8px] text-muted-foreground text-center line-clamp-2 px-0.5">
                    {rec.card_name}
                  </span>
                </div>
              )}
              <span className="text-[10px] text-muted-foreground leading-tight text-center line-clamp-1 w-full">
                {rec.card_name}
              </span>
              {rec.mana_cost && (
                <ManaCost cost={rec.mana_cost} size="xs" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
