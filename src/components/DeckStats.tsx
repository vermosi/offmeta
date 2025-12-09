import { Deck, getDeckCardCount } from "@/lib/deck";
import { groupCardsByType } from "@/lib/card-grouping";
import { BarChart3, Layers, Mountain, Zap } from "lucide-react";

interface DeckStatsProps {
  deck: Deck;
}

interface TypeStats {
  type: string;
  count: number;
  percentage: number;
}

function calculateDeckStats(deck: Deck) {
  const mainboard = deck.mainboard;
  const totalCards = getDeckCardCount(deck, "mainboard");
  
  if (totalCards === 0) {
    return {
      avgManaValue: 0,
      landCount: 0,
      nonLandCount: 0,
      landPercentage: 0,
      typeBreakdown: [] as TypeStats[],
      creatureCount: 0,
      spellCount: 0,
    };
  }

  // Calculate average mana value (excluding lands)
  let totalManaValue = 0;
  let nonLandCards = 0;
  let landCount = 0;
  let creatureCount = 0;
  let spellCount = 0;

  mainboard.forEach((dc) => {
    const typeLine = dc.card.type_line?.toLowerCase() || "";
    const isLand = typeLine.includes("land");
    const isCreature = typeLine.includes("creature");
    const isSpell = typeLine.includes("instant") || typeLine.includes("sorcery");

    if (isLand) {
      landCount += dc.quantity;
    } else {
      nonLandCards += dc.quantity;
      totalManaValue += dc.card.cmc * dc.quantity;
    }

    if (isCreature) creatureCount += dc.quantity;
    if (isSpell) spellCount += dc.quantity;
  });

  const avgManaValue = nonLandCards > 0 ? totalManaValue / nonLandCards : 0;
  const landPercentage = (landCount / totalCards) * 100;

  // Type breakdown
  const groups = groupCardsByType(mainboard);
  const typeBreakdown: TypeStats[] = groups.map((group) => ({
    type: group.type,
    count: group.count,
    percentage: (group.count / totalCards) * 100,
  }));

  return {
    avgManaValue,
    landCount,
    nonLandCount: nonLandCards,
    landPercentage,
    typeBreakdown,
    creatureCount,
    spellCount,
  };
}

export function DeckStats({ deck }: DeckStatsProps) {
  const stats = calculateDeckStats(deck);
  const totalCards = getDeckCardCount(deck, "mainboard");

  if (totalCards === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Statistics</span>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center transition-colors hover:bg-muted/50">
          <Zap className="h-4 w-4 mx-auto mb-1.5 text-primary" />
          <div className="text-lg font-semibold text-foreground">{stats.avgManaValue.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">Avg MV</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center transition-colors hover:bg-muted/50">
          <Mountain className="h-4 w-4 mx-auto mb-1.5 text-amber-500" />
          <div className="text-lg font-semibold text-foreground">{stats.landCount}</div>
          <div className="text-xs text-muted-foreground">Lands</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center transition-colors hover:bg-muted/50">
          <Layers className="h-4 w-4 mx-auto mb-1.5 text-blue-400" />
          <div className="text-lg font-semibold text-foreground">{stats.nonLandCount}</div>
          <div className="text-xs text-muted-foreground">Spells</div>
        </div>
      </div>

      {/* Type breakdown bars */}
      <div className="space-y-2">
        {stats.typeBreakdown.map((type) => (
          <div key={type.type} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{type.type}</span>
              <span className="font-medium text-foreground">
                {type.count} <span className="text-muted-foreground">({type.percentage.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/80 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${type.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
