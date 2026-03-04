/**
 * Explanation panel — enhanced card explanation using existing Meta Context.
 * Shows a simplified "Explain This Card" when a specific card is detected.
 * @module components/ExplanationPanel
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ScryfallCard } from '@/types/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BookOpen, AlertTriangle, Zap } from 'lucide-react';
import { logger } from '@/lib/core/logger';
import { ManaSymbol } from '@/components/ManaSymbol';
import { formatManaSymbols } from '@/lib/scryfall/client';

interface ExplanationPanelProps {
  card: ScryfallCard | null | undefined;
  isLoading?: boolean;
}

export function ExplanationPanel({ card, isLoading: externalLoading }: ExplanationPanelProps) {
  const [rationale, setRationale] = useState<string | null>(null);
  const [archetypes, setArchetypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!card) return;
    let cancelled = false;

    setRationale(null);
    setArchetypes([]);
    setError(null);
    setLoading(true);

    const fetchExplanation = async () => {
      const { data, error: fnError } = await supabase.functions.invoke(
        'card-meta-context',
        {
          body: {
            cardName: card.name,
            typeLine: card.type_line,
            oracleText: card.oracle_text,
            colorIdentity: card.color_identity,
            edhrecRank: card.edhrec_rank,
            legalities: card.legalities,
          },
        },
      );

      if (cancelled) return;
      if (fnError || !data?.success) {
        logger.warn('Explanation fetch failed', fnError || data?.error);
        setError('Could not generate explanation');
        setLoading(false);
        return;
      }

      setRationale(data.rationale || '');
      setArchetypes(data.archetypes || []);
      setLoading(false);
    };

    fetchExplanation();
    return () => { cancelled = true; };
  }, [card]);

  if (externalLoading || !card) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Search for a specific card name to see an explanation
        </p>
      </div>
    );
  }

  const manaSymbols = formatManaSymbols(card.mana_cost || '');

  return (
    <div className="space-y-4">
      {/* Card header */}
      <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-foreground">{card.name}</h3>
            <p className="text-sm text-muted-foreground">{card.type_line}</p>
          </div>
          {manaSymbols.length > 0 && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {manaSymbols.map((symbol, i) => (
                <ManaSymbol key={i} symbol={symbol} size="md" />
              ))}
            </div>
          )}
        </div>

        {card.oracle_text && (
          <p className="text-sm leading-relaxed text-foreground/80 mt-3 whitespace-pre-line">
            {card.oracle_text}
          </p>
        )}
      </div>

      {/* Explanation */}
      {loading && (
        <div className="space-y-2 p-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {rationale && !loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Why Players Use This Card</h4>
          </div>
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-sm leading-relaxed text-foreground/90">
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
      )}
    </div>
  );
}
