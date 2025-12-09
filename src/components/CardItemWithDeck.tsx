import { useState, useEffect } from "react";
import { ScryfallCard } from "@/types/card";
import { getCardImage, getRarityColor } from "@/lib/scryfall";
import { isInCollection, getCollectionQuantity } from "@/lib/collection";
import { cn } from "@/lib/utils";
import { Plus, Eye, BookMarked } from "lucide-react";

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
      className="group relative w-full aspect-[2.5/3.5] rounded-xl overflow-hidden card-hover cursor-pointer"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onContextMenu={handleContextMenu}
    >
      <img
        src={imageUrl}
        alt={card.name}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      
      {/* Quantity badge (in deck) */}
      {quantity > 0 && (
        <div className="absolute top-2 left-2 h-7 w-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shadow-lg z-10">
          {quantity}
        </div>
      )}

      {/* Collection indicator */}
      {inCollection && (
        <div className="absolute top-2 left-10 flex items-center gap-1 bg-green-500/90 text-white px-1.5 py-0.5 rounded-full text-xs font-semibold shadow-lg z-10">
          <BookMarked className="h-3 w-3" />
          {totalOwned}
        </div>
      )}
      
      {/* Rarity indicator */}
      <div className={cn(
        "absolute top-2 right-2 h-2 w-2 rounded-full",
        card.rarity === "mythic" && "bg-orange-400 shadow-lg shadow-orange-400/50",
        card.rarity === "rare" && "bg-gold shadow-lg shadow-gold/50",
        card.rarity === "uncommon" && "bg-slate-300",
        card.rarity === "common" && "bg-slate-500"
      )} />

      {/* Overlay on hover */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300",
        isHovered ? "opacity-100" : "opacity-0"
      )} />
      
      {/* Actions on hover */}
      <div className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 transition-opacity duration-300",
        isHovered ? "opacity-100" : "opacity-0"
      )}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToDeck();
          }}
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add to Deck
          <kbd className="ml-auto text-xs opacity-70 bg-black/20 px-1 rounded">A</kbd>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          className="w-full py-2 px-4 bg-muted/80 text-foreground rounded-lg font-medium text-sm hover:bg-muted transition-colors flex items-center justify-center gap-2"
        >
          <Eye className="h-4 w-4" />
          View Details
          <kbd className="ml-auto text-xs opacity-70 bg-black/20 px-1 rounded">V</kbd>
        </button>
      </div>

      {/* Card info at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
        <p className="text-sm font-display font-semibold text-foreground truncate">
          {card.name}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground truncate max-w-[60%]">
            {card.set_name}
          </span>
          <span className={cn("text-xs font-semibold capitalize", rarityClass)}>
            {card.rarity}
          </span>
        </div>
      </div>
    </div>
  );
}
