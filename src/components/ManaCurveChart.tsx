import { getManaCurve, Deck } from "@/lib/deck";
import { cn } from "@/lib/utils";

interface ManaCurveChartProps {
  deck: Deck;
}

export function ManaCurveChart({ deck }: ManaCurveChartProps) {
  const curve = getManaCurve(deck);
  const maxCount = Math.max(...curve.map((c) => c.count), 1);

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Mana Curve
      </h4>
      <div className="flex items-end justify-between gap-1 h-24 px-1">
        {curve.map((item) => (
          <div key={item.cmc} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col items-center justify-end h-16">
              {item.count > 0 && (
                <span className="text-xs text-muted-foreground mb-1">
                  {item.count}
                </span>
              )}
              <div
                className={cn(
                  "w-full rounded-t transition-all duration-300",
                  item.count > 0
                    ? "bg-gradient-to-t from-primary/80 to-primary"
                    : "bg-muted/30"
                )}
                style={{
                  height: `${(item.count / maxCount) * 100}%`,
                  minHeight: item.count > 0 ? "4px" : "2px",
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {item.cmc === 7 ? "7+" : item.cmc}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
