import { useEffect } from 'react';
import { useSimilarCards } from '@/hooks/useSimilarCards';
import { SimilarCardsPanel } from '@/components/SimilarCardsPanel';
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
  const { similarityData, isLoading, activate } = useSimilarCards(query, fallbackCard);

  useEffect(() => {
    if (active) activate();
  }, [active, activate]);

  return <SimilarCardsPanel data={similarityData} isLoading={isLoading} onCardClick={onCardClick} />;
}
