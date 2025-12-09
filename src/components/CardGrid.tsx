import { ScryfallCard } from "@/types/card";
import { CardItem } from "./CardItem";
import { Loader2 } from "lucide-react";

interface CardGridProps {
  cards: ScryfallCard[];
  isLoading: boolean;
  onCardClick: (card: ScryfallCard) => void;
}

export function CardGrid({ cards, isLoading, onCardClick }: CardGridProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="mt-4 text-muted-foreground">Summoning cards...</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {cards.map((card, index) => (
        <div
          key={card.id}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <CardItem card={card} onClick={() => onCardClick(card)} />
        </div>
      ))}
    </div>
  );
}
