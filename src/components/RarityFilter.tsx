import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface RarityFilterProps {
  selectedRarities: string[];
  onRarityToggle: (rarity: string) => void;
}

const rarities = [
  { id: "common", name: "Common", color: "bg-slate-600 text-slate-100" },
  { id: "uncommon", name: "Uncommon", color: "bg-slate-400 text-slate-900" },
  { id: "rare", name: "Rare", color: "bg-amber-500 text-amber-950" },
  { id: "mythic", name: "Mythic", color: "bg-orange-500 text-orange-950" },
];

export function RarityFilter({ selectedRarities, onRarityToggle }: RarityFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {rarities.map((rarity) => {
        const isSelected = selectedRarities.includes(rarity.id);
        return (
          <button
            key={rarity.id}
            onClick={() => onRarityToggle(rarity.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200",
              rarity.color,
              isSelected
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                : "opacity-50 hover:opacity-80"
            )}
          >
            {rarity.name}
          </button>
        );
      })}
    </div>
  );
}
