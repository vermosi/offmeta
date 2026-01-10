/**
 * Card item component for displaying a single card in the search results grid.
 * Memoized to prevent unnecessary re-renders in large lists.
 */

import { memo } from "react";
import { ScryfallCard } from "@/types/card";
import { getCardImage } from "@/lib/scryfall";
import { cn } from "@/lib/utils";

interface CardItemProps {
  card: ScryfallCard;
  onClick: () => void;
}

export const CardItem = memo(function CardItem({ card, onClick }: CardItemProps) {
  const imageUrl = getCardImage(card, "normal");

  return (
    <button
      onClick={onClick}
      className="group relative w-full aspect-[2.5/3.5] rounded-xl overflow-hidden bg-secondary card-hover focus-ring"
      aria-label={`View details for ${card.name} from ${card.set_name}, ${card.rarity} rarity`}
    >
      {/* Card image */}
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 will-change-transform"
        aria-hidden="true"
      />
      
      {/* Gradient overlay on hover */}
      <div 
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
        aria-hidden="true"
      />
      
      {/* Card info on hover */}
      <div 
        className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out will-change-transform"
        aria-hidden="true"
      >
        <p className="text-sm font-medium text-white truncate">
          {card.name}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-white/70 truncate max-w-[60%]">
            {card.set_name}
          </span>
          <span className={cn(
            "text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full",
            card.rarity === "mythic" && "bg-orange-500/40 text-orange-100",
            card.rarity === "rare" && "bg-amber-500/40 text-amber-100",
            card.rarity === "uncommon" && "bg-slate-400/30 text-slate-100",
            card.rarity === "common" && "bg-slate-500/30 text-slate-200"
          )}>
            {card.rarity}
          </span>
        </div>
      </div>
      
      {/* Hover border */}
      <div 
        className="absolute inset-0 rounded-xl border border-white/0 group-hover:border-white/15 transition-colors duration-300" 
        aria-hidden="true"
      />
    </button>
  );
});
