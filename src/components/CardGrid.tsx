import { ScryfallCard } from "@/types/card";
import { CardItem } from "./CardItem";
import { Loader2 } from "lucide-react";
import { CardGridSkeleton } from "./LoadingSkeletons";

interface CardGridProps {
  cards: ScryfallCard[];
  isLoading: boolean;
  onCardClick: (card: ScryfallCard) => void;
}

export function CardGrid({ cards, isLoading, onCardClick }: CardGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Searching cards...</span>
        </div>
        <CardGridSkeleton count={12} />
      </div>
    );
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {cards.map((card, index) => (
        <div
          key={card.id}
          className="animate-fade-in"
          style={{ 
            animationDelay: `${Math.min(index * 30, 300)}ms`,
            animationFillMode: 'both',
          }}
        >
          <CardItem card={card} onClick={() => onCardClick(card)} />
        </div>
      ))}
    </div>
  );
}
