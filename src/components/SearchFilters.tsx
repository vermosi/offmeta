import { ColorFilter } from "./ColorFilter";
import { RarityFilter } from "./RarityFilter";
import { Button } from "@/components/ui/button";
import { X, Filter } from "lucide-react";
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

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "gap-2",
            isOpen && "bg-muted"
          )}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasFilters && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
              {selectedColors.length + selectedRarities.length}
            </span>
          )}
        </Button>
        
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="p-4 bg-card/50 border border-border rounded-xl space-y-4 animate-fade-in">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Mana Color
            </label>
            <ColorFilter
              selectedColors={selectedColors}
              onColorToggle={onColorToggle}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
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
