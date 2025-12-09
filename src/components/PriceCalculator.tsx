import { Deck } from "@/lib/deck";
import { DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceCalculatorProps {
  deck: Deck;
}

interface PriceBreakdown {
  usd: number;
  usdFoil: number;
  eur: number;
}

function calculateDeckPrice(deck: Deck): PriceBreakdown {
  let usd = 0;
  let usdFoil = 0;
  let eur = 0;
  
  [...deck.mainboard, ...deck.sideboard].forEach((dc) => {
    const quantity = dc.quantity;
    if (dc.card.prices.usd) {
      usd += parseFloat(dc.card.prices.usd) * quantity;
    }
    if (dc.card.prices.usd_foil) {
      usdFoil += parseFloat(dc.card.prices.usd_foil) * quantity;
    }
    if (dc.card.prices.eur) {
      eur += parseFloat(dc.card.prices.eur) * quantity;
    }
  });
  
  return { usd, usdFoil, eur };
}

export function PriceCalculator({ deck }: PriceCalculatorProps) {
  const prices = calculateDeckPrice(deck);
  const hasCards = deck.mainboard.length > 0 || deck.sideboard.length > 0;
  
  if (!hasCards) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Deck Price</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 text-center transition-colors hover:bg-muted/50">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-0.5">USD</span>
          <p className={cn(
            "text-sm font-semibold tabular-nums",
            prices.usd > 0 ? "text-emerald-500" : "text-muted-foreground"
          )}>
            ${prices.usd.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 text-center transition-colors hover:bg-muted/50">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-0.5">EUR</span>
          <p className={cn(
            "text-sm font-semibold tabular-nums",
            prices.eur > 0 ? "text-blue-500" : "text-muted-foreground"
          )}>
            €{prices.eur.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 text-center transition-colors hover:bg-muted/50">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-0.5">Foil</span>
          <p className={cn(
            "text-sm font-semibold tabular-nums",
            prices.usdFoil > 0 ? "text-amber-500" : "text-muted-foreground"
          )}>
            ${prices.usdFoil.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
