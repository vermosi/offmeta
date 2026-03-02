/**
 * "Why It's Played" meta intelligence section for CardModal.
 * Shows EDHREC popularity, AI-generated rationale, format tags, and archetype chips.
 * @module components/CardModal/CardModalMetaContext
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { getEdhrecPercentile, getEdhrecTier } from '@/lib/scryfall/edhrec';
import { matchArchetypes } from '@/lib/scryfall/archetype-matching';
import type { ScryfallCard } from '@/types/card';

import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  Brain,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { logger } from '@/lib/core/logger';

export interface CardModalMetaContextProps {
  card: ScryfallCard;
  isMobile?: boolean;
}

const TIER_BADGE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'info' | 'secondary' | 'outline'> = {
  staple: 'success',
  popular: 'info',
  common: 'secondary',
  niche: 'outline',
  obscure: 'outline',
};

const FORMAT_DISPLAY: Record<string, string> = {
  commander: 'Commander',
  modern: 'Modern',
  standard: 'Standard',
  pioneer: 'Pioneer',
  legacy: 'Legacy',
  vintage: 'Vintage',
  pauper: 'Pauper',
  brawl: 'Brawl',
};

export function CardModalMetaContext({ card, isMobile }: CardModalMetaContextProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [rationale, setRationale] = useState<string | null>(null);
  const [aiArchetypes, setAiArchetypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const edhrecRank = card.edhrec_rank;
  const tier = edhrecRank ? getEdhrecTier(edhrecRank) : null;
  const percentile = edhrecRank ? getEdhrecPercentile(edhrecRank) : null;

  // Local archetype matching (instant, no API call)
  const oracleText = card.card_faces?.[0]?.oracle_text ?? card.oracle_text;
  const matchedArchetypes = matchArchetypes(oracleText, card.type_line);

  // Legal formats for chips
  const legalFormats = Object.entries(card.legalities)
    .filter(([, status]) => status === 'legal')
    .map(([format]) => format)
    .filter((f) => FORMAT_DISPLAY[f])
    .slice(0, 6);

  // Fetch AI rationale on expand
  useEffect(() => {
    if (!expanded || rationale !== null || isLoading) return;

    let cancelled = false;

    const fetchMeta = async () => {
      setIsLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke(
        'card-meta-context',
        {
          body: {
            cardName: card.name,
            typeLine: card.type_line,
            oracleText,
            colorIdentity: card.color_identity,
            edhrecRank: card.edhrec_rank,
            legalities: card.legalities,
          },
        },
      );

      if (cancelled) return;
      if (fnError) {
        logger.warn('Meta context fetch error', fnError);
        setError(t('card.metaError', 'Could not load meta context'));
        setIsLoading(false);
        return;
      }
      if (data?.success) {
        setRationale(data.rationale || '');
        setAiArchetypes(data.archetypes || []);
      } else {
        setError(data?.error || t('card.metaError', 'Could not load meta context'));
      }
      setIsLoading(false);
    };

    fetchMeta();

    return () => {
      cancelled = true;
    };
  }, [expanded, rationale, isLoading, card, oracleText, t]);

  // Don't render if card has no useful meta data
  if (!edhrecRank && legalFormats.length === 0 && matchedArchetypes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full"
      >
        <Brain className="h-3.5 w-3.5" />
        <span>{t('card.whyPlayed', 'Why It\'s Played')}</span>

        {/* Inline EDHREC badge */}
        {percentile && tier && (
          <Badge
            variant={TIER_BADGE_VARIANT[tier]}
            size="sm"
            className="ml-1 normal-case tracking-normal"
          >
            <TrendingUp className="h-3 w-3 mr-0.5" />
            {percentile}
          </Badge>
        )}

        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 ml-auto" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 ml-auto" />
        )}
      </button>

      {expanded && (
        <div className="space-y-3 pt-1">
          {/* EDHREC rank detail */}
          {edhrecRank && (
            <div className="text-xs text-muted-foreground">
              {t('card.edhrecRank', 'EDHREC Rank')}: #{edhrecRank.toLocaleString()} ({percentile})
            </div>
          )}

          {/* Format legality chips */}
          {legalFormats.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {legalFormats.map((format) => (
                <Badge key={format} variant="outline" size="sm">
                  {FORMAT_DISPLAY[format]}
                </Badge>
              ))}
            </div>
          )}

          {/* Archetype chips (local matching) */}
          {matchedArchetypes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {matchedArchetypes.map((arch) => (
                <a
                  key={arch.slug}
                  href={`/archetypes/${arch.slug}`}
                  className="no-underline"
                >
                  <Badge
                    variant="secondary"
                    size="sm"
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                  >
                    {arch.name}
                  </Badge>
                </a>
              ))}
            </div>
          )}

          {/* AI Rationale */}
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}

          {error && !isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{error}</span>
            </div>
          )}

          {rationale && !isLoading && (
            <div className="text-sm leading-relaxed text-foreground/90 p-3 rounded-lg bg-muted/30 border border-border/30">
              {rationale}

              {/* AI-suggested archetypes (deduplicated from local matches) */}
              {aiArchetypes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {aiArchetypes
                    .filter((a) => !matchedArchetypes.some((m) => m.name.toLowerCase() === a.toLowerCase()))
                    .slice(0, isMobile ? 3 : 4)
                    .map((tag) => (
                      <Badge key={tag} variant="outline" size="sm" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
