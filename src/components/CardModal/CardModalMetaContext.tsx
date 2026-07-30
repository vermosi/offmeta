/**
 * "Why It's Played" meta intelligence section for CardModal.
 * Shows EDHREC popularity, AI-generated rationale, format tags, and archetype chips.
 * @module components/CardModal/CardModalMetaContext
 */

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { getEdhrecPercentile, getEdhrecTier } from '@/lib/scryfall/edhrec';
import type { ScryfallCard } from '@/types/card';
import { CardExplainabilitySummary } from '@/components/CardExplainabilitySummary';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  Brain,
  TrendingUp,
} from 'lucide-react';

export interface CardModalMetaContextProps {
  card: ScryfallCard;
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

export function CardModalMetaContext({ card }: CardModalMetaContextProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);

  const edhrecRank = card.edhrec_rank;
  const tier = edhrecRank ? getEdhrecTier(edhrecRank) : null;
  const percentile = edhrecRank ? getEdhrecPercentile(edhrecRank) : null;

  // Legal formats for chips
  const legalFormats = Object.entries(card.legalities)
    .filter(([, status]) => status === 'legal')
    .map(([format]) => format)
    .filter((f) => FORMAT_DISPLAY[f])
    .slice(0, 6);

  // Don't render if card has no useful meta data
  if (!edhrecRank && legalFormats.length === 0) {
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
          <CardExplainabilitySummary
            card={card}
            title={t('card.whyPlayed', 'Why It\'s Played')}
            compact
          />

        </div>
      )}
    </div>
  );
}
