/**
 * Similar Cards panel — shows similar cards and budget alternatives.
 * @module components/SimilarCardsPanel
 */

import { type SimilarityData } from '@/hooks';
import type { ScryfallCard } from '@/types/card';
import { CardItem } from '@/components/CardItem';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sparkles, DollarSign } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

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
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  cards: ScryfallCard[];
  onCardClick: (card: ScryfallCard, index: number) => void;
  emptyMessage: string;
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
          <div key={card.id} className="animate-reveal" style={{ animationDelay: `${i * 30}ms` }}>
            <CardItem card={card} onClick={() => onCardClick(card, i)} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SimilarCardsPanel({ data, isLoading, onCardClick }: SimilarCardsPanelProps) {
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

  const similarCards = data.similarResults?.data || [];
  const budgetCards = data.budgetResults?.data || [];

  return (
    <div className="space-y-6">
      {/* Source card info */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm">
          {t('similar.showingSimilarTo')}{' '}<strong className="text-foreground">{data.sourceCard.name}</strong>
        </span>
      </div>

      <CardSection
        title={t('similar.title')}
        icon={Sparkles}
        cards={similarCards}
        onCardClick={onCardClick}
        emptyMessage={t('similar.noSimilar')}
      />

      <CardSection
        title={t('similar.budget')}
        icon={DollarSign}
        cards={budgetCards}
        onCardClick={onCardClick}
        emptyMessage={t('similar.noBudget')}
      />

    </div>
  );
}
