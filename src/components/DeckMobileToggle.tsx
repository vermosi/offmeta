import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Library } from "lucide-react";
import { Deck, getDeckCardCount } from "@/lib/deck";
import { DeckPanel } from "./DeckPanel";

interface DeckMobileToggleProps {
  deck: Deck;
  onDeckChange: (deck: Deck) => void;
  onClearDeck: () => void;
}

export function DeckMobileToggle({ deck, onDeckChange, onClearDeck }: DeckMobileToggleProps) {
  const count = getDeckCardCount(deck, "mainboard") + getDeckCardCount(deck, "sideboard");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="gold"
          size="lg"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl md:hidden"
        >
          <Library className="h-6 w-6" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 h-6 w-6 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center font-bold">
              {count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-96 p-0">
        <DeckPanel deck={deck} onDeckChange={onDeckChange} onClearDeck={onClearDeck} />
      </SheetContent>
    </Sheet>
  );
}
