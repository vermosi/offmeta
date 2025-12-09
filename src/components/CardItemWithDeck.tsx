import { useState, useEffect } from "react";
import { ScryfallCard } from "@/types/card";
import { getCardImage, getRarityColor } from "@/lib/scryfall";
import { isInCollection, getCollectionQuantity } from "@/lib/collection";
import { cn } from "@/lib/utils";
import { Plus, Eye, Check } from "lucide-react";

interface CardItemWithDeckProps {
  card: ScryfallCard;
  quantity: number;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  onAddToDeck: () => void;
  onAddToSideboard: () => void;
  onViewDetails: () => void;
}

export function CardItemWithDeck({
  card,
  quantity,
  isHovered,
  onHover,
  onAddToDeck,
  onAddToSideboard,
  onViewDetails,
}: CardItemWithDeckProps) {
  const imageUrl = getCardImage(card, "normal");
  const rarityClass = getRarityColor(card.rarity);
  const [inCollection, setInCollection] = useState(false);
  const [collectionQty, setCollectionQty] = useState({ regular: 0, foil: 0 });

  useEffect(() => {
    setInCollection(isInCollection(card.id));
    setCollectionQty(getCollectionQuantity(card.id));
  }, [card.id]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onAddToSideboard();
  };

  const totalOwned = collectionQty.regular + collectionQty.foil;

  return (
    <div
      className="group relative w-full aspect-[2.5/3.5] rounded-lg overflow-hidden bg-muted/30 cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onContextMenu={handleContextMenu}
    >
      <img
        src={imageUrl}
        alt={card.name}
        loading="lazy"
        className="w-full h-full object-cover"
      />
      
      {/* Quantity badge (in deck) */}
      {quantity > 0 && (
        <div className="absolute top-2 left-2 h-6 w-6 bg-foreground text-background rounded-full flex items-center justify-center text-xs font-semibold shadow-md">
          {quantity}
        </div>
      )}

      {/* Collection indicator */}
      {inCollection && (
        <div className="absolute top-2 left-10 flex items-center gap-1 bg-emerald-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-medium shadow-md">
          <Check className="h-2.5 w-2.5" />
          {totalOwned}
        </div>
      )}
      
      {/* Rarity dot */}
      <div className={cn(
        "absolute top-2 right-2 h-2 w-2 rounded-full shadow-sm",
        card.rarity === "mythic" && "bg-orange-400",
        card.rarity === "rare" && "bg-amber-400",
        card.rarity === "uncommon" && "bg-slate-400",
        card.rarity === "common" && "bg-slate-600"
      )} />

      {/* Hover overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-200",
        isHovered ? "opacity-100" : "opacity-0"
      )} />
      
      {/* Actions on hover */}
      <div className={cn(
        "absolute inset-x-0 bottom-0 p-3 flex flex-col gap-2 transition-all duration-200",
        isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToDeck();
          }}
          className="w-full py-2 bg-foreground text-background rounded-md text-xs font-medium hover:bg-foreground/90 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add to Deck
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          className="w-full py-2 bg-background/80 backdrop-blur-sm text-foreground rounded-md text-xs font-medium hover:bg-background/90 transition-colors flex items-center justify-center gap-1.5"
        >
          <Eye className="h-3.5 w-3.5" />
          Details
        </button>
      </div>

      {/* Card name tooltip on hover */}
      <div className={cn(
        "absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-200",
        !isHovered ? "opacity-100" : "opacity-0"
      )}>
        <p className="text-xs font-medium text-white truncate">
          {card.name}
        </p>
      </div>
    </div>
  );
}