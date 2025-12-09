import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  addToCollection, 
  removeFromCollection, 
  getCollectionQuantity,
} from "@/lib/collection";
import { ScryfallCard } from "@/types/card";
import { BookMarked, Plus, Minus, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CollectionButtonProps {
  card: ScryfallCard;
  variant?: "icon" | "full";
}

export function CollectionButton({ card, variant = "icon" }: CollectionButtonProps) {
  const [quantities, setQuantities] = useState(() => getCollectionQuantity(card.id));
  const [isOpen, setIsOpen] = useState(false);

  const handleAdd = (isFoil: boolean) => {
    addToCollection(card.id, card.name, 1, isFoil);
    setQuantities(getCollectionQuantity(card.id));
    toast.success(`Added ${isFoil ? "foil " : ""}${card.name} to collection`);
  };

  const handleRemove = (isFoil: boolean) => {
    removeFromCollection(card.id, 1, isFoil);
    setQuantities(getCollectionQuantity(card.id));
  };

  const totalOwned = quantities.regular + quantities.foil;
  const inCollection = totalOwned > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {variant === "icon" ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 transition-colors",
              inCollection 
                ? "text-primary hover:text-primary/80" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {inCollection ? (
              <Check className="h-4 w-4" />
            ) : (
              <BookMarked className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <Button
            variant={inCollection ? "secondary" : "outline"}
            size="sm"
            className="gap-2 h-9"
          >
            <BookMarked className="h-4 w-4" />
            {inCollection ? `Owned (${totalOwned})` : "Add to Collection"}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="end">
        <div className="p-3 border-b border-border/50">
          <h4 className="font-medium text-sm text-foreground">Collection</h4>
        </div>
        <div className="p-3 space-y-3">
          {/* Regular copies */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Regular</span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => handleRemove(false)}
                disabled={quantities.regular === 0}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center font-semibold text-sm tabular-nums">
                {quantities.regular}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => handleAdd(false)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {/* Foil copies */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Foil
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => handleRemove(true)}
                disabled={quantities.foil === 0}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center font-semibold text-sm tabular-nums">
                {quantities.foil}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => handleAdd(true)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
