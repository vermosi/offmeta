import { DeckCard } from "@/lib/deck";
import { ScryfallCard } from "@/types/card";

export interface CardTypeGroup {
  type: string;
  cards: DeckCard[];
  count: number;
}

const typeOrder = [
  "Creature",
  "Planeswalker",
  "Instant",
  "Sorcery",
  "Artifact",
  "Enchantment",
  "Land",
  "Other",
];

function getCardMainType(card: ScryfallCard): string {
  const typeLine = card.type_line?.toLowerCase() || "";
  
  if (typeLine.includes("creature")) return "Creature";
  if (typeLine.includes("planeswalker")) return "Planeswalker";
  if (typeLine.includes("instant")) return "Instant";
  if (typeLine.includes("sorcery")) return "Sorcery";
  if (typeLine.includes("artifact")) return "Artifact";
  if (typeLine.includes("enchantment")) return "Enchantment";
  if (typeLine.includes("land")) return "Land";
  return "Other";
}

export function groupCardsByType(cards: DeckCard[]): CardTypeGroup[] {
  const groups: Record<string, DeckCard[]> = {};
  
  cards.forEach((dc) => {
    const type = getCardMainType(dc.card);
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(dc);
  });
  
  // Sort cards within each group by CMC then name
  Object.values(groups).forEach((group) => {
    group.sort((a, b) => {
      if (a.card.cmc !== b.card.cmc) {
        return a.card.cmc - b.card.cmc;
      }
      return a.card.name.localeCompare(b.card.name);
    });
  });
  
  // Return groups in order
  return typeOrder
    .filter((type) => groups[type]?.length > 0)
    .map((type) => ({
      type,
      cards: groups[type],
      count: groups[type].reduce((sum, dc) => sum + dc.quantity, 0),
    }));
}

export function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    Creature: "👤",
    Planeswalker: "⚡",
    Instant: "💨",
    Sorcery: "✨",
    Artifact: "⚙️",
    Enchantment: "🔮",
    Land: "🏔️",
    Other: "📦",
  };
  return icons[type] || "📦";
}
