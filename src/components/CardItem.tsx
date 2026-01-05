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

  return (
    <button
      onClick={onClick}
      className="group relative w-full aspect-[2.5/3.5] rounded-2xl overflow-hidden card-3d focus-ring"
      aria-label={`View details for ${card.name} from ${card.set_name}, ${card.rarity} rarity`}
    >
      {/* Card image */}
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        aria-hidden="true"
      />
      
      {/* Gradient overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" 
        aria-hidden="true"
      />
      
      {/* Top shine effect */}
      <div 
        className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        aria-hidden="true"
      />
      
      {/* Card info on hover */}
      <div 
        className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"
        aria-hidden="true"
      >
        <p className="text-base font-semibold text-white truncate">
          {card.name}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-white/70 truncate max-w-[60%]">
            {card.set_name}
          </span>
          <span className={cn(
            "text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full",
            card.rarity === "mythic" && "bg-orange-500/30 text-orange-200 shadow-lg shadow-orange-500/20",
            card.rarity === "rare" && "bg-amber-500/30 text-amber-200 shadow-lg shadow-amber-500/20",
            card.rarity === "uncommon" && "bg-slate-400/25 text-slate-200",
            card.rarity === "common" && "bg-slate-500/25 text-slate-300"
          )}>
            {card.rarity}
          </span>
        </div>
      </div>
      
      {/* Rarity indicator with enhanced glow */}
      <div 
        className={cn(
          "absolute top-3 right-3 h-2.5 w-2.5 rounded-full transition-all duration-300",
          card.rarity === "mythic" && "bg-orange-400 shadow-[0_0_12px_3px] shadow-orange-400/60",
          card.rarity === "rare" && "bg-amber-400 shadow-[0_0_12px_3px] shadow-amber-400/50",
          card.rarity === "uncommon" && "bg-slate-300 shadow-[0_0_8px_2px] shadow-slate-300/30",
          card.rarity === "common" && "bg-slate-500"
        )}
        aria-hidden="true"
      />

      {/* Hover border effect */}
      <div 
        className="absolute inset-0 rounded-2xl border-2 border-white/0 group-hover:border-white/20 transition-colors duration-500" 
        aria-hidden="true"
      />
      
      {/* Corner accent on hover */}
      <div 
        className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-tl-2xl"
        aria-hidden="true"
      />
    </button>
  );
}