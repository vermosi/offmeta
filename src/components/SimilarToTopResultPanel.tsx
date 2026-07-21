/**
 * "Similar to this result" — compact discovery panel shown above the
 * results grid on the Cards tab. Seeded from the current top result
 * (a real ScryfallCard) so we get useful signals even when the user's
 * query is a concept (not a card name). Offers one-click refine chips
 * that pipe curated Scryfall queries back into the search input.
 */

import { useEffect, useMemo } from 'react';
import { Sparkles, DollarSign, Zap, ArrowRight } from 'lucide-react';
import { useSimilarCards } from '@/hooks/useSimilarCards';
import { CardItem } from '@/components/CardItem';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n';
import { useAnalytics } from '@/hooks/useAnalytics';
import type { ScryfallCard } from '@/types/card';

interface SimilarToTopResultPanelProps {
  topCard: ScryfallCard;
  originalQuery: string;
  onRefine: (query: string) => void;
  onCardClick: (card: ScryfallCard, index: number) => void;
}

const MAX_CARDS = 4;

export function SimilarToTopResultPanel({
  topCard,
  originalQuery,
  onRefine,
  onCardClick,
}: SimilarToTopResultPanelProps) {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const { similarityData, isLoading, activate } = useSimilarCards(topCard.name);

  // Auto-activate on mount — this panel is meant to be visible eagerly.
  useEffect(() => {
    activate();
  }, [activate]);

  const similarCards = similarityData?.similarResults?.data ?? [];
  const budgetCards = similarityData?.budgetResults?.data ?? [];
  const hasAnything = similarCards.length > 0 || budgetCards.length > 0;

  const chips = useMemo(() => {
    const items: { key: string; label: string; query: string; icon: typeof Sparkles }[] = [];
    if (similarCards.length > 0) {
      items.push({
        key: 'similar',
        label: t('similar.refine.similarTo', 'Similar to {name}').replace(
          '{name}',
          topCard.name,
        ),
        query: `similar to ${topCard.name}`,
        icon: Sparkles,
      });
    }
    if (budgetCards.length > 0) {
      items.push({
        key: 'budget',
        label: t('similar.refine.budget', 'Budget alternatives'),
        query: `budget alternatives to ${topCard.name}`,
        icon: DollarSign,
      });
    }
    // Always offer a "played with" refine using synergy signals if present.
    if ((similarityData?.synergyCards?.length ?? 0) > 0) {
      items.push({
        key: 'synergy',
        label: t('similar.refine.playedWith', 'Cards played with {name}').replace(
          '{name}',
          topCard.name,
        ),
        query: `cards played with ${topCard.name}`,
        icon: Zap,
      });
    }
    return items;
  }, [similarCards.length, budgetCards.length, similarityData?.synergyCards?.length, topCard.name, t]);

  const handleRefine = (chipKey: string, query: string) => {
    trackEvent('similar_panel_refine_clicked', {
      chip: chipKey,
      source_card: topCard.name,
      query: originalQuery,
    });
    onRefine(query);
  };

  if (!isLoading && !hasAnything && chips.length === 0) return null;

  const preview = similarCards.length > 0 ? similarCards : budgetCards;

  return (
    <section
      className="rounded-2xl border border-border/60 bg-card/60 p-3 sm:p-4 animate-reveal"
      aria-label={t('similar.panel.ariaLabel', 'Similar to this result')}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground truncate">
            {t('similar.panel.title', 'Similar to')}{' '}
            <span className="text-accent">{topCard.name}</span>
          </h3>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map(({ key, label, query, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleRefine(key, query)}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-foreground transition-colors hover:border-accent/40 hover:bg-accent/5 hover:text-accent"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{label}</span>
              <ArrowRight className="h-3 w-3 opacity-60" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-3">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            {Array.from({ length: MAX_CARDS }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : preview.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            {preview.slice(0, MAX_CARDS).map((card, i) => (
              <div
                key={card.id}
                className="animate-reveal"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <CardItem card={card} onClick={() => onCardClick(card, i)} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
