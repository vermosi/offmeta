import { useState } from "react";
import { Deck, DeckCard } from "@/lib/deck";
import { getCardImage } from "@/lib/scryfall";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shuffle, Hand, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SampleHandProps {
  deck: Deck;
}

function drawRandomHand(deck: Deck, count: number = 7): DeckCard[] {
  const pool: DeckCard[] = [];
  deck.mainboard.forEach((dc) => {
    for (let i = 0; i < dc.quantity; i++) {
      pool.push({ ...dc, quantity: 1 });
    }
  });
  
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  
  return pool.slice(0, Math.min(count, pool.length));
}

export function SampleHand({ deck }: SampleHandProps) {
  const [hand, setHand] = useState<DeckCard[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const totalCards = deck.mainboard.reduce((sum, dc) => sum + dc.quantity, 0);
  
  const handleDraw = () => {
    setIsDrawing(true);
    setHand([]);
    setTimeout(() => {
      setHand(drawRandomHand(deck, 7));
      setIsDrawing(false);
    }, 150);
  };
  
  const handleMulligan = () => {
    const newCount = Math.max(hand.length - 1, 1);
    setIsDrawing(true);
    setHand([]);
    setTimeout(() => {
      setHand(drawRandomHand(deck, newCount));
      setIsDrawing(false);
    }, 150);
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
          className="gap-2 h-8 text-xs"
          disabled={totalCards < 7}
          onClick={handleOpen}
        >
          <Hand className="h-3.5 w-3.5" />
          Sample Hand
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl bg-background border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Hand className="h-5 w-5 text-primary" />
            Sample Opening Hand
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-2">
          {/* Hand display */}
          <div className="flex flex-wrap justify-center gap-2 py-4 min-h-[220px] items-center">
            {isDrawing ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shuffle className="h-5 w-5 animate-spin" />
                <span className="text-sm">Shuffling...</span>
              </div>
            ) : hand.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Click "Draw New Hand" to draw 7 cards
              </p>
            ) : (
              hand.map((dc, index) => (
                <div
                  key={`${dc.card.id}-${index}`}
                  className={cn(
                    "relative transition-all duration-300 ease-out",
                    "hover:scale-110 hover:z-10 hover:-translate-y-2"
                  )}
                  style={{
                    animation: `slideUp 0.4s ease-out forwards`,
                    animationDelay: `${index * 60}ms`,
                    opacity: 0,
                    transform: `rotate(${(index - 3) * 2}deg) translateY(20px)`,
                  }}
                >
                  <img
                    src={getCardImage(dc.card, "normal")}
                    alt={dc.card.name}
                    className="h-44 rounded-lg shadow-lg cursor-pointer"
                  />
                </div>
              ))
            )}
          </div>
          
          {/* Hand info */}
          {hand.length > 0 && (
            <div className="text-center text-xs text-muted-foreground">
              Drawing {hand.length} cards from {totalCards} card deck
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center justify-center gap-3">
            <Button onClick={handleDraw} className="gap-2 h-9">
              <Shuffle className="h-4 w-4" />
              Draw New Hand
            </Button>
            <Button
              onClick={handleMulligan}
              variant="outline"
              className="gap-2 h-9"
              disabled={hand.length <= 1}
            >
              <RotateCcw className="h-4 w-4" />
              Mulligan ({hand.length > 1 ? hand.length - 1 : 0})
            </Button>
          </div>
        </div>
        
        <style>{`
          @keyframes slideUp {
            to {
              opacity: 1;
              transform: rotate(var(--rotate, 0deg)) translateY(0);
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
