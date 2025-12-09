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
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <DollarSign className="h-4 w-4" />
        Deck Price
      </h4>
      <div className="grid grid-cols-3 gap-2">
        <div className="px-3 py-2 bg-muted/50 rounded-lg text-center">
          <span className="text-xs text-muted-foreground block">USD</span>
          <p className={cn(
            "font-bold",
            prices.usd > 0 ? "text-green-400" : "text-muted-foreground"
          )}>
            ${prices.usd.toFixed(2)}
          </p>
        </div>
        <div className="px-3 py-2 bg-muted/50 rounded-lg text-center">
          <span className="text-xs text-muted-foreground block">EUR</span>
          <p className={cn(
            "font-bold",
            prices.eur > 0 ? "text-blue-400" : "text-muted-foreground"
          )}>
            €{prices.eur.toFixed(2)}
          </p>
        </div>
        <div className="px-3 py-2 bg-muted/50 rounded-lg text-center">
          <span className="text-xs text-muted-foreground block">Foil</span>
          <p className={cn(
            "font-bold",
            prices.usdFoil > 0 ? "text-primary" : "text-muted-foreground"
          )}>
            ${prices.usdFoil.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
