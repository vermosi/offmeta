import { cn } from "@/lib/utils";

interface RarityFilterProps {
  selectedRarities: string[];
  onRarityToggle: (rarity: string) => void;
}

const rarities = [
  { id: "common", name: "Common", bg: "bg-slate-500", text: "text-white" },
  { id: "uncommon", name: "Uncommon", bg: "bg-slate-400", text: "text-slate-900" },
  { id: "rare", name: "Rare", bg: "bg-amber-500", text: "text-amber-950" },
  { id: "mythic", name: "Mythic", bg: "bg-orange-500", text: "text-white" },
];

export function RarityFilter({ selectedRarities, onRarityToggle }: RarityFilterProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {rarities.map((rarity) => {
        const isSelected = selectedRarities.includes(rarity.id);
        return (
          <button
            key={rarity.id}
            onClick={() => onRarityToggle(rarity.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
              rarity.bg,
              rarity.text,
              isSelected
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md"
                : "opacity-60 hover:opacity-90"
            )}
          >
            {rarity.name}
          </button>
        );
      })}
    </div>
  );
}
