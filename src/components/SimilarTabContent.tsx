import { useEffect } from 'react';
import { useSimilarCards } from '@/hooks/useSimilarCards';
import { SimilarCardsPanel } from '@/components/SimilarCardsPanel';
import type { ScryfallCard } from '@/types/card';

interface SimilarTabContentProps {
  query: string;
  active: boolean;
  onCardClick: (card: ScryfallCard, index: number) => void;
}

export function SimilarTabContent({
  query,
  active,
  onCardClick,
}: SimilarTabContentProps) {
  const { similarityData, isLoading, activate } = useSimilarCards(query);

  useEffect(() => {
    if (active) activate();
  }, [active, activate]);

  return <SimilarCardsPanel data={similarityData} isLoading={isLoading} onCardClick={onCardClick} />;
}
