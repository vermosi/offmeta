import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useSimilarCards } from '@/hooks/useSimilarCards';
import { SimilarCardsPanel } from '@/components/SimilarCardsPanel';
import { Button } from '@/components/ui/button';
import type { ScryfallCard } from '@/types/card';

interface SimilarTabContentProps {
  query: string;
  active: boolean;
  onCardClick: (card: ScryfallCard, index: number) => void;
  /** Fallback source card when the query is not a card name (e.g. top search result). */
  fallbackCard?: ScryfallCard | null;
}

export function SimilarTabContent({
  query,
  active,
  onCardClick,
  fallbackCard,
}: SimilarTabContentProps) {
  const { similarityData, isLoading, errorMessage, activate } = useSimilarCards(
    query,
    fallbackCard,
  );
  const queryClient = useQueryClient();

  useEffect(() => {
    if (active) activate();
  }, [active, activate]);

  if (errorMessage) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-lg border border-border/60 bg-card/60 p-6 text-center"
      >
        <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ['similar-cards'] })
          }
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <SimilarCardsPanel
      data={similarityData}
      isLoading={isLoading}
      onCardClick={onCardClick}
    />
  );
}
