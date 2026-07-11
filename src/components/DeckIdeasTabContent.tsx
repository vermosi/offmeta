import { useEffect } from 'react';
import { useDeckIdeas } from '@/hooks/useDeckIdeas';
import { DeckIdeasPanel } from '@/components/DeckIdeasPanel';

interface DeckIdeasTabContentProps {
  query: string;
  active: boolean;
}

export function DeckIdeasTabContent({
  query,
  active,
}: DeckIdeasTabContentProps) {
  const { deckIdea, isLoading, activate } = useDeckIdeas(query);

  useEffect(() => {
    if (active) activate();
  }, [active, activate]);

  return <DeckIdeasPanel data={deckIdea} isLoading={isLoading} query={query} />;
}
