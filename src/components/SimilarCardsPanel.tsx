/**
 * Similar Cards panel — shows similar cards, budget alternatives, and synergy cards.
 * @module components/SimilarCardsPanel
 */

import type { SimilarityData, SynergyCard } from '@/hooks/useSimilarCards';
import type { ScryfallCard } from '@/types/card';
import { CardItem } from '@/components/CardItem';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sparkles, DollarSign, Zap, ExternalLink } from 'lucide-react';
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

function SynergySection({
  synergyCards,
  playedAlongsideLabel,
}: {
  synergyCards: SynergyCard[];
  playedAlongsideLabel: string;
}) {
  const { t } = useTranslation();

  if (synergyCards.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{t('similar.synergy')}</h3>
        <Badge variant="secondary" size="sm" className="ml-1">
          {synergyCards.length}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {playedAlongsideLabel}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {synergyCards.map((card) => (
          <a
            key={card.name}
            href={`https://scryfall.com/search?q=!"${encodeURIComponent(card.name)}"`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/30 hover:border-primary/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-foreground truncate">
                  {card.name}
                </span>
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {card.reason}
              </p>
            </div>
          </a>
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

      <SynergySection
        synergyCards={data.synergyCards}
        sourceCardName={data.sourceCard.name}
        playedAlongsideLabel={t('similar.playedAlongside').replace('{name}', data.sourceCard.name)}
      />
    </div>
  );
}
