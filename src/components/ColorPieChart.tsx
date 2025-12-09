import { getColorDistribution, Deck } from "@/lib/deck";
import { cn } from "@/lib/utils";
import { Palette } from "lucide-react";

interface ColorPieChartProps {
  deck: Deck;
}

const colorConfig: Record<string, { bg: string; border: string; name: string }> = {
  W: { bg: "bg-amber-100 dark:bg-amber-200", border: "border-amber-200", name: "White" },
  U: { bg: "bg-blue-500", border: "border-blue-400", name: "Blue" },
  B: { bg: "bg-zinc-800", border: "border-zinc-600", name: "Black" },
  R: { bg: "bg-red-500", border: "border-red-400", name: "Red" },
  G: { bg: "bg-emerald-600", border: "border-emerald-500", name: "Green" },
  C: { bg: "bg-slate-400", border: "border-slate-300", name: "Colorless" },
};

export function ColorPieChart({ deck }: ColorPieChartProps) {
  const distribution = getColorDistribution(deck);
  const total = distribution.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Colors</span>
      </div>
      
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">No cards added</p>
      ) : (
        <>
          <div className="flex h-2 rounded-full overflow-hidden bg-muted/30">
            {distribution.map((item, index) => {
              const config = colorConfig[item.color];
              return (
                <div
                  key={item.color}
                  className={cn(config?.bg, "transition-all duration-500 ease-out first:rounded-l-full last:rounded-r-full")}
                  style={{ 
                    width: `${(item.count / total) * 100}%`,
                    transitionDelay: `${index * 50}ms`,
                  }}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {distribution.map((item, index) => {
              const config = colorConfig[item.color];
              return (
                <div 
                  key={item.color} 
                  className="flex items-center gap-1.5 text-xs animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className={cn("h-2.5 w-2.5 rounded-full border", config?.bg, config?.border)} />
                  <span className="text-muted-foreground">
                    {item.name}: <span className="font-medium text-foreground">{item.count}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
