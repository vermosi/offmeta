/**
 * "Why It's Played" meta intelligence section for CardModal.
 * Shows EDHREC popularity, AI-generated rationale, format tags, archetype chips,
 * and format-specific synergy cards.
 * @module components/CardModal/CardModalMetaContext
 */

import { useState, useEffect, useCallback } from 'react';
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
  Zap,
  Loader2,
} from 'lucide-react';
import { logger } from '@/lib/core/logger';

interface SynergyCard {
  oracle_id: string;
  card_name: string;
  cooccurrence_count: number;
  mana_cost: string | null;
  type_line: string | null;
  image_url: string | null;
}

export interface CardModalMetaContextProps {
  card: ScryfallCard;
  oracleId?: string;
  onCardClick?: (cardName: string) => void;
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

const SYNERGY_FORMATS = ['commander', 'modern', 'standard', 'pioneer', 'legacy', 'vintage', 'pauper'] as const;

function getBestFormat(legalities: Record<string, string>): string {
  // Prefer Commander, then first legal format from the list
  if (legalities.commander === 'legal') return 'commander';
  for (const f of SYNERGY_FORMATS) {
    if (legalities[f] === 'legal') return f;
  }
  return 'all';
}

export function CardModalMetaContext({ card, oracleId, onCardClick, isMobile }: CardModalMetaContextProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [rationale, setRationale] = useState<string | null>(null);
  const [aiArchetypes, setAiArchetypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Synergy cards state
  const [synergyCards, setSynergyCards] = useState<SynergyCard[]>([]);
  const [synergyLoading, setSynergyLoading] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState(() => getBestFormat(card.legalities));
  const [synergyError, setSynergyError] = useState(false);

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

  // Fetch synergy cards when expanded and format changes
  useEffect(() => {
    if (!expanded || !oracleId) return;
    let cancelled = false;
    setSynergyLoading(true);
    setSynergyError(false);

    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke(
          'card-recommendations',
          { body: { oracle_id: oracleId, format: selectedFormat, limit: 4 } },
        );
        if (fnErr) throw fnErr;
        if (!cancelled && data?.recommendations) {
          setSynergyCards(data.recommendations);
        }
      } catch {
        if (!cancelled) setSynergyError(true);
      } finally {
        if (!cancelled) setSynergyLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [expanded, oracleId, selectedFormat]);

  const handleFormatChange = useCallback((format: string) => {
    setSelectedFormat(format);
    setSynergyCards([]);
  }, []);

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

          {/* Format-specific synergy cards */}
          {oracleId && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Zap className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-medium text-muted-foreground">
                  {t('card.synergizesWith', 'Synergizes With')}
                </span>
                {/* Format selector badges */}
                <div className="flex flex-wrap gap-1">
                  {SYNERGY_FORMATS
                    .filter((f) => card.legalities[f] === 'legal')
                    .slice(0, isMobile ? 4 : 6)
                    .map((f) => (
                      <Badge
                        key={f}
                        variant={selectedFormat === f ? 'default' : 'outline'}
                        size="sm"
                        className="cursor-pointer transition-colors"
                        onClick={() => handleFormatChange(f)}
                      >
                        {FORMAT_DISPLAY[f] || f}
                      </Badge>
                    ))}
                </div>
              </div>

              {synergyLoading ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : synergyError ? (
                <p className="text-xs text-muted-foreground italic">
                  {t('card.synergyUnavailable', 'Synergy data unavailable')}
                </p>
              ) : synergyCards.length > 0 ? (
                <div className={`grid gap-2 ${isMobile ? 'grid-cols-4' : 'grid-cols-4'}`}>
                  {synergyCards.map((sc) => (
                    <button
                      key={sc.oracle_id}
                      type="button"
                      className="group flex flex-col items-center gap-1 rounded-lg p-1 hover:bg-secondary/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() => onCardClick?.(sc.card_name)}
                      title={sc.card_name}
                    >
                      {sc.image_url ? (
                        <img
                          src={sc.image_url}
                          alt={sc.card_name}
                          className="w-full aspect-[2.5/3.5] rounded object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full aspect-[2.5/3.5] rounded bg-secondary flex items-center justify-center">
                          <span className="text-[8px] text-muted-foreground text-center line-clamp-2 px-0.5">
                            {sc.card_name}
                          </span>
                        </div>
                      )}
                      <span className="text-[10px] text-muted-foreground leading-tight text-center line-clamp-1 w-full">
                        {sc.card_name}
                      </span>
                    </button>
                  ))}
                </div>
              ) : !synergyLoading ? (
                <p className="text-xs text-muted-foreground italic">
                  {t('card.noSynergyData', 'No synergy data for this format')}
                </p>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
