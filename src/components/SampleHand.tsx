import { useState } from "react";
import { Deck, DeckCard } from "@/lib/deck";
import { getCardImage } from "@/lib/scryfall";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shuffle, Hand, RotateCcw } from "lucide-react";

interface SampleHandProps {
  deck: Deck;
}

function drawRandomHand(deck: Deck, count: number = 7): DeckCard[] {
  // Build a pool of all cards based on quantity
  const pool: DeckCard[] = [];
  deck.mainboard.forEach((dc) => {
    for (let i = 0; i < dc.quantity; i++) {
      pool.push({ ...dc, quantity: 1 });
    }
  });
  
  // Shuffle using Fisher-Yates
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  
  // Draw cards
  return pool.slice(0, Math.min(count, pool.length));
}

export function SampleHand({ deck }: SampleHandProps) {
  const [hand, setHand] = useState<DeckCard[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  const totalCards = deck.mainboard.reduce((sum, dc) => sum + dc.quantity, 0);
  
  const handleDraw = () => {
    setHand(drawRandomHand(deck, 7));
  };
  
  const handleMulligan = () => {
    const newCount = Math.max(hand.length - 1, 1);
    setHand(drawRandomHand(deck, newCount));
  };
  
  const handleOpen = () => {
    if (totalCards >= 7) {
      handleDraw();
    }
    setIsOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={totalCards < 7}
          onClick={handleOpen}
        >
          <Hand className="h-4 w-4" />
          Sample Hand
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Hand className="h-5 w-5 text-primary" />
            Sample Opening Hand
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Hand display */}
          <div className="flex flex-wrap justify-center gap-2 py-4">
            {hand.length === 0 ? (
              <p className="text-muted-foreground py-8">
                Click "Draw New Hand" to draw 7 cards
              </p>
            ) : (
              hand.map((dc, index) => (
                <div
                  key={`${dc.card.id}-${index}`}
                  className="relative animate-scale-in"
                  style={{
                    animationDelay: `${index * 50}ms`,
                    transform: `rotate(${(index - 3) * 3}deg)`,
                  }}
                >
                  <img
                    src={getCardImage(dc.card, "normal")}
                    alt={dc.card.name}
                    className="h-48 rounded-lg shadow-xl hover:scale-110 hover:z-10 transition-transform duration-200 cursor-pointer"
                  />
                </div>
              ))
            )}
          </div>
          
          {/* Hand info */}
          {hand.length > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Drawing {hand.length} cards from {totalCards} card deck
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center justify-center gap-3">
            <Button onClick={handleDraw} variant="gold" className="gap-2">
              <Shuffle className="h-4 w-4" />
              Draw New Hand
            </Button>
            <Button
              onClick={handleMulligan}
              variant="outline"
              className="gap-2"
              disabled={hand.length <= 1}
            >
              <RotateCcw className="h-4 w-4" />
              Mulligan ({hand.length > 1 ? hand.length - 1 : 0})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
