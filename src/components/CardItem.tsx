/**
 * Card item component for displaying a single card in the search results grid.
 * Shows card image with hover effects revealing name, set, and rarity.
 * @module components/CardItem
 */

import { ScryfallCard } from "@/types/card";
import { getCardImage, getRarityColor } from "@/lib/scryfall";
import { cn } from "@/lib/utils";

interface CardItemProps {
  /** The Scryfall card data to display */
  card: ScryfallCard;
  /** Callback when the card is clicked (opens modal) */
  onClick: () => void;
}

/**
 * Renders a card preview tile with hover effects.
 * Displays card image, name, set name, and rarity indicator.
 */
export function CardItem({ card, onClick }: CardItemProps) {
  const imageUrl = getCardImage(card, "normal");
  const rarityClass = getRarityColor(card.rarity);

  return (
    <button
      onClick={onClick}
      className="group relative w-full aspect-[2.5/3.5] rounded-xl overflow-hidden card-hover focus:outline-none focus:ring-2 focus:ring-primary/50"
    >
      <img
        src={imageUrl}
        alt={card.name}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Card info on hover */}
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
      
      {/* Rarity indicator */}
      <div className={cn(
        "absolute top-2 right-2 h-2 w-2 rounded-full",
        card.rarity === "mythic" && "bg-orange-400 shadow-lg shadow-orange-400/50",
        card.rarity === "rare" && "bg-gold shadow-lg shadow-gold/50",
        card.rarity === "uncommon" && "bg-slate-300",
        card.rarity === "common" && "bg-slate-500"
      )} />
    </button>
  );
}
