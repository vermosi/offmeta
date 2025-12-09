import { DeckCard } from "@/lib/deck";
import { getCardImage, getRarityColor } from "@/lib/scryfall";
import { ManaCost } from "./ManaSymbol";
import { Button } from "@/components/ui/button";
import { Plus, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeckListItemProps {
  deckCard: DeckCard;
  onAdd: () => void;
  onRemove: () => void;
  onRemoveAll: () => void;
}

export function DeckListItem({ deckCard, onAdd, onRemove, onRemoveAll }: DeckListItemProps) {
  const { card, quantity } = deckCard;
  const imageUrl = getCardImage(card, "small");
  const rarityClass = getRarityColor(card.rarity);

  return (
    <div className="group flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="relative h-10 w-7 rounded overflow-hidden flex-shrink-0">
        <img
          src={imageUrl}
          alt={card.name}
          className="h-full w-full object-cover"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-primary">{quantity}x</span>
          <span className={cn("text-sm truncate", rarityClass)}>
            {card.name}
          </span>
        </div>
      </div>

      {card.mana_cost && (
        <ManaCost cost={card.mana_cost} size="sm" />
      )}

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onRemove}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onAdd}
        >
          <Plus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={onRemoveAll}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
