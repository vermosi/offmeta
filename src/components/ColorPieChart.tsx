import { getColorDistribution, Deck } from "@/lib/deck";
import { cn } from "@/lib/utils";

interface ColorPieChartProps {
  deck: Deck;
}

const colorClasses: Record<string, string> = {
  W: "bg-amber-100",
  U: "bg-blue-500",
  B: "bg-gray-800",
  R: "bg-red-500",
  G: "bg-green-600",
  C: "bg-gray-400",
};

export function ColorPieChart({ deck }: ColorPieChartProps) {
  const distribution = getColorDistribution(deck);
  const total = distribution.reduce((sum, c) => sum + c.count, 0);

  if (total === 0) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Colors
        </h4>
        <p className="text-sm text-muted-foreground">No cards added</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Colors
      </h4>
      <div className="flex items-center gap-3">
        <div className="flex h-4 flex-1 rounded-full overflow-hidden">
          {distribution.map((item, index) => (
            <div
              key={item.color}
              className={cn(colorClasses[item.color], "transition-all duration-300")}
              style={{ width: `${(item.count / total) * 100}%` }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {distribution.map((item) => (
          <div key={item.color} className="flex items-center gap-1.5 text-xs">
            <div className={cn("h-3 w-3 rounded-full", colorClasses[item.color])} />
            <span className="text-muted-foreground">
              {item.name}: {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
