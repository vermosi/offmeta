import { getManaCurve, Deck } from "@/lib/deck";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface ManaCurveChartProps {
  deck: Deck;
}

export function ManaCurveChart({ deck }: ManaCurveChartProps) {
  const curve = getManaCurve(deck);
  const maxCount = Math.max(...curve.map((c) => c.count), 1);
  const hasCards = curve.some(c => c.count > 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Mana Curve</span>
      </div>
      
      {!hasCards ? (
        <p className="text-sm text-muted-foreground">Add cards to see the curve</p>
      ) : (
        <div className="flex items-end justify-between gap-1.5 h-28 px-1">
          {curve.map((item, index) => (
            <div 
              key={item.cmc} 
              className="flex-1 flex flex-col items-center gap-1"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="w-full flex flex-col items-center justify-end h-20">
                {item.count > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground mb-1 animate-fade-in">
                    {item.count}
                  </span>
                )}
                <div
                  className={cn(
                    "w-full rounded-t-sm transition-all duration-500 ease-out",
                    item.count > 0
                      ? "bg-primary/80"
                      : "bg-muted/30"
                  )}
                  style={{
                    height: item.count > 0 ? `${Math.max((item.count / maxCount) * 100, 8)}%` : "2px",
                    transitionDelay: `${index * 50}ms`,
                  }}
                />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                {item.cmc === 7 ? "7+" : item.cmc}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
