/**
 * Similar Cards panel — shows similar cards and budget alternatives.
 * @module components/SimilarCardsPanel
 */

import { useEffect, useId, useRef } from 'react';
import { type SimilarityData } from '@/hooks';
import type { ScryfallCard } from '@/types/card';
import type { RankingScoreBreakdown } from '@/types/recommendations';
import { CardItem } from '@/components/CardItem';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sparkles, DollarSign } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useAnalytics } from '@/hooks/useAnalytics';

interface SimilarCardsPanelProps {
  data: SimilarityData | null | undefined;
  isLoading: boolean;
  onCardClick: (card: ScryfallCard, index: number) => void;
}

function CardSection({
  title,
  icon: Icon,
  cards,
  onCardClick,
  emptyMessage,
  sourceCard,
  surface,
  breakdowns,
  requestId,
  renderedAt,
  includeBreakdowns,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  cards: ScryfallCard[];
  onCardClick: (card: ScryfallCard, index: number) => void;
  emptyMessage: string;
  sourceCard: string;
  surface: 'similar' | 'budget';
  breakdowns: Map<string, RankingScoreBreakdown>;
  requestId: string;
  renderedAt: React.RefObject<number>;
  includeBreakdowns: boolean;
}) {
  if (cards.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Badge variant="secondary" size="sm" className="ml-1">
          {cards.length}
        </Badge>
      </div>
      <div className="grid grid-cols-2 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {cards.slice(0, 8).map((card, i) => (
          <TrackedRecommendationCard
            key={card.id}
            card={card}
            index={i}
            sourceCard={sourceCard}
            surface={surface}
            breakdown={breakdowns.get(card.id)}
            requestId={requestId}
            renderedAt={renderedAt}
            includeBreakdown={includeBreakdowns}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </div>
  );
}

function TrackedRecommendationCard({
  card,
  index,
  sourceCard,
  surface,
  breakdown,
  requestId,
  renderedAt,
  includeBreakdown,
  onCardClick,
}: {
  card: ScryfallCard;
  index: number;
  sourceCard: string;
  surface: 'similar' | 'budget';
  breakdown?: RankingScoreBreakdown;
  requestId: string;
  renderedAt: React.RefObject<number>;
  includeBreakdown: boolean;
  onCardClick: (card: ScryfallCard, index: number) => void;
}) {
  const { trackEvent } = useAnalytics();
  const ref = useRef<HTMLDivElement>(null);
  const impressedRef = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          impressedRef.current ||
          !entries.some((entry) => entry.isIntersecting)
        ) {
          return;
        }
        impressedRef.current = true;
        trackEvent('recommendation_impression', {
          query: sourceCard,
          request_id: requestId,
          result_set_id: requestId,
          card_id: card.id,
          card_name: card.name,
          source_card: sourceCard,
          visible_position: index + 1,
          surface,
          ranker_version: 'v2',
          score: breakdown?.finalScore,
          confidence: breakdown?.confidence,
          score_breakdown:
            includeBreakdown && breakdown
              ? JSON.stringify(breakdown)
              : undefined,
        });
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [
    breakdown,
    card.id,
    card.name,
    includeBreakdown,
    index,
    requestId,
    sourceCard,
    surface,
    trackEvent,
  ]);

  return (
    <div
      ref={ref}
      className="animate-reveal"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <CardItem
        card={card}
        onClick={() => {
          trackEvent('recommendation_click', {
            query: sourceCard,
            request_id: requestId,
            result_set_id: requestId,
            card_id: card.id,
            card_name: card.name,
            source_card: sourceCard,
            visible_position: index + 1,
            surface,
            ranker_version: 'v2',
            score: breakdown?.finalScore,
            confidence: breakdown?.confidence,
            score_breakdown: breakdown ? JSON.stringify(breakdown) : undefined,
            time_to_click_ms: Math.max(0, Date.now() - renderedAt.current),
          });
          onCardClick(card, index);
        }}
      />
    </div>
  );
}

export function SimilarCardsPanel({
  data,
  isLoading,
  onCardClick,
}: SimilarCardsPanelProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-6 py-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-40 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          {t('similar.searchPrompt')}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('similar.searchHint')}
        </p>
      </div>
    );
  }

  return (
    <RecommendationResultSet
      key={data.sourceCard.id}
      data={data}
      onCardClick={onCardClick}
    />
  );
}

function RecommendationResultSet({
  data,
  onCardClick,
}: {
  data: SimilarityData;
  onCardClick: (card: ScryfallCard, index: number) => void;
}) {
  const { t } = useTranslation();
  const reactId = useId();
  const requestId = `recommendation-${data.sourceCard.id}-${reactId}`;
  const renderedAt = useRef(0);
  const includeBreakdowns =
    [...requestId].reduce(
      (sum, character) => sum + character.charCodeAt(0),
      0,
    ) %
      10 ===
    0;

  useEffect(() => {
    renderedAt.current = Date.now();
  }, []);

  const similarCards = data.similarResults?.data || [];
  const budgetCards = data.budgetResults?.data || [];
  const similarBreakdowns = new Map(
    (data.rankedSimilar ?? []).map((entry) => [entry.card.id, entry.breakdown]),
  );
  const budgetBreakdowns = new Map(
    (data.rankedBudget ?? []).map((entry) => [entry.card.id, entry.breakdown]),
  );

  return (
    <div className="space-y-6">
      {/* Source card info */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm">
          {t('similar.showingSimilarTo')}{' '}
          <strong className="text-foreground">{data.sourceCard.name}</strong>
        </span>
      </div>

      <CardSection
        title={t('similar.title')}
        icon={Sparkles}
        cards={similarCards}
        onCardClick={onCardClick}
        emptyMessage={t('similar.noSimilar')}
        sourceCard={data.sourceCard.name}
        surface="similar"
        breakdowns={similarBreakdowns}
        requestId={requestId}
        renderedAt={renderedAt}
        includeBreakdowns={includeBreakdowns}
      />

      <CardSection
        title={t('similar.budget')}
        icon={DollarSign}
        cards={budgetCards}
        onCardClick={onCardClick}
        emptyMessage={t('similar.noBudget')}
        sourceCard={data.sourceCard.name}
        surface="budget"
        breakdowns={budgetBreakdowns}
        requestId={requestId}
        renderedAt={renderedAt}
        includeBreakdowns={includeBreakdowns}
      />
    </div>
  );
}
