/**
 * Card item component for displaying a single card in the search results grid.
 */

import { ScryfallCard } from "@/types/card";
import { getCardImage, getRarityColor } from "@/lib/scryfall";
import { cn } from "@/lib/utils";

interface CardItemProps {
  card: ScryfallCard;
  onClick: () => void;
}

export function CardItem({ card, onClick }: CardItemProps) {
  const imageUrl = getCardImage(card, "normal");
  const rarityClass = getRarityColor(card.rarity);

  return (
    <button
      onClick={onClick}
      className="group relative w-full aspect-[2.5/3.5] rounded-2xl overflow-hidden card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Card image */}
      <img
        src={imageUrl}
        alt={card.name}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
      />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
      
      {/* Card info on hover */}
      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
        <p className="text-sm font-semibold text-white truncate">
          {card.name}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-white/70 truncate max-w-[60%]">
            {card.set_name}
          </span>
          <span className={cn("text-xs font-semibold capitalize px-2 py-0.5 rounded-full", 
            card.rarity === "mythic" && "bg-orange-500/20 text-orange-400",
            card.rarity === "rare" && "bg-amber-500/20 text-amber-400",
            card.rarity === "uncommon" && "bg-slate-400/20 text-slate-300",
            card.rarity === "common" && "bg-slate-500/20 text-slate-400"
          )}>
            {card.rarity}
          </span>
        </div>
      </div>
      
      {/* Rarity indicator glow */}
      <div className={cn(
        "absolute top-3 right-3 h-2.5 w-2.5 rounded-full transition-all duration-300",
        card.rarity === "mythic" && "bg-orange-400 shadow-[0_0_12px_3px] shadow-orange-400/60",
        card.rarity === "rare" && "bg-amber-400 shadow-[0_0_12px_3px] shadow-amber-400/50",
        card.rarity === "uncommon" && "bg-slate-300 shadow-[0_0_8px_2px] shadow-slate-300/30",
        card.rarity === "common" && "bg-slate-500"
      )} />

      {/* Hover border effect */}
      <div className="absolute inset-0 rounded-2xl border border-white/0 group-hover:border-white/20 transition-colors duration-500" />
    </button>
  );
}