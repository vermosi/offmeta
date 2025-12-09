import { ColorFilter } from "./ColorFilter";
import { RarityFilter } from "./RarityFilter";
import { Button } from "@/components/ui/button";
import { X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchFiltersProps {
  selectedColors: string[];
  selectedRarities: string[];
  onColorToggle: (color: string) => void;
  onRarityToggle: (rarity: string) => void;
  onClearFilters: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function SearchFilters({
  selectedColors,
  selectedRarities,
  onColorToggle,
  onRarityToggle,
  onClearFilters,
  isOpen,
  onToggle,
}: SearchFiltersProps) {
  const hasFilters = selectedColors.length > 0 || selectedRarities.length > 0;
  const filterCount = selectedColors.length + selectedRarities.length;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "gap-2 h-8 text-xs font-medium transition-colors",
            isOpen 
              ? "bg-muted text-foreground" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {hasFilters && (
            <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full font-semibold">
              {filterCount}
            </span>
          )}
        </Button>
        
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="p-4 bg-muted/30 border border-border/50 rounded-xl space-y-4 animate-fade-in">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Mana Color
            </label>
            <ColorFilter
              selectedColors={selectedColors}
              onColorToggle={onColorToggle}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Rarity
            </label>
            <RarityFilter
              selectedRarities={selectedRarities}
              onRarityToggle={onRarityToggle}
            />
          </div>
        </div>
      )}
    </div>
  );
}
