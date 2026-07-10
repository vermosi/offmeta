/**
 * Shared explainability block for card, deck, and search-adjacent surfaces.
 * Fetches the "why this card matters" rationale from the existing
 * `card-meta-context` edge function and renders a compact narrative.
 */

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/lib/i18n';
import type { ScryfallCard } from '@/types/card';
import { logger } from '@/lib/core/logger';

interface CardExplainabilitySummaryProps {
  card: ScryfallCard;
  title?: string;
  compact?: boolean;
}

export function CardExplainabilitySummary({
  card,
  title,
  compact = false,
}: CardExplainabilitySummaryProps) {
  const { t } = useTranslation();
  const [rationale, setRationale] = useState<string | null>(null);
  const [archetypes, setArchetypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRationale(null);
    setArchetypes([]);

    void supabase.functions
      .invoke('card-meta-context', {
        body: {
          cardName: card.name,
          typeLine: card.type_line,
          oracleText: card.oracle_text,
          colorIdentity: card.color_identity,
          edhrecRank: card.edhrec_rank,
          legalities: card.legalities,
        },
      })
      .then(({ data, error: fnError }) => {
        if (cancelled) return;
        if (fnError || !data?.success) {
          logger.warn('Card explainability fetch failed', fnError || data?.error);
          setError(t('explanation.errorGenerate'));
          return;
        }

        setRationale(data.rationale || '');
        setArchetypes(data.archetypes || []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [card, t]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2 rounded-xl border border-primary/10 bg-primary/5 p-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[88%]" />
          <Skeleton className="h-4 w-[72%]" />
        </div>
      </div>
    );
  }

  if (error && !rationale) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <p className="text-xs text-destructive">{error}</p>
      </div>
    );
  }

  if (!rationale) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <Zap className="h-4 w-4 text-primary" />
        <h4 className={compact ? 'text-xs font-semibold text-foreground' : 'text-sm font-semibold text-foreground'}>
          {title ?? t('explanation.whyPlayed')}
        </h4>
      </div>
      <div className={`rounded-xl border border-primary/10 bg-primary/5 ${compact ? 'p-3 text-xs' : 'p-4 text-sm'} leading-relaxed text-foreground/90`}>
        {rationale}
      </div>
      {archetypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {archetypes.map((arch) => (
            <Badge key={arch} variant="secondary" size="sm">
              {arch}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
