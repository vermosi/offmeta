import { ScryfallCard } from "@/types/card";

export interface DeckCard {
  card: ScryfallCard;
  quantity: number;
}

export interface Deck {
  mainboard: DeckCard[];
  sideboard: DeckCard[];
  name: string;
}

export function createEmptyDeck(): Deck {
  return {
    mainboard: [],
    sideboard: [],
    name: "New Deck",
  };
}

export function addCardToDeck(
  deck: Deck,
  card: ScryfallCard,
  board: "mainboard" | "sideboard" = "mainboard"
): Deck {
  const targetBoard = [...deck[board]];
  const existingIndex = targetBoard.findIndex((dc) => dc.card.id === card.id);

  if (existingIndex >= 0) {
    targetBoard[existingIndex] = {
      ...targetBoard[existingIndex],
      quantity: targetBoard[existingIndex].quantity + 1,
    };
  } else {
    targetBoard.push({ card, quantity: 1 });
  }

  return { ...deck, [board]: targetBoard };
}

export function removeCardFromDeck(
  deck: Deck,
  cardId: string,
  board: "mainboard" | "sideboard" = "mainboard"
): Deck {
  const targetBoard = [...deck[board]];
  const existingIndex = targetBoard.findIndex((dc) => dc.card.id === cardId);

  if (existingIndex >= 0) {
    if (targetBoard[existingIndex].quantity > 1) {
      targetBoard[existingIndex] = {
        ...targetBoard[existingIndex],
        quantity: targetBoard[existingIndex].quantity - 1,
      };
    } else {
      targetBoard.splice(existingIndex, 1);
    }
  }

  return { ...deck, [board]: targetBoard };
}

export function getDeckCardCount(deck: Deck, board: "mainboard" | "sideboard"): number {
  return deck[board].reduce((sum, dc) => sum + dc.quantity, 0);
}

export function getManaCurve(deck: Deck): { cmc: number; count: number }[] {
  const curve: Record<number, number> = {};
  
  deck.mainboard.forEach((dc) => {
    const cmc = Math.min(Math.floor(dc.card.cmc), 7); // Cap at 7+
    curve[cmc] = (curve[cmc] || 0) + dc.quantity;
  });

  return Array.from({ length: 8 }, (_, i) => ({
    cmc: i,
    count: curve[i] || 0,
  }));
}

export function getColorDistribution(deck: Deck): { color: string; count: number; name: string }[] {
  const colors: Record<string, number> = {
    W: 0,
    U: 0,
    B: 0,
    R: 0,
    G: 0,
    C: 0,
  };

  const colorNames: Record<string, string> = {
    W: "White",
    U: "Blue",
    B: "Black",
    R: "Red",
    G: "Green",
    C: "Colorless",
  };

  deck.mainboard.forEach((dc) => {
    const cardColors = dc.card.colors || [];
    if (cardColors.length === 0) {
      colors["C"] += dc.quantity;
    } else {
      cardColors.forEach((color) => {
        colors[color] += dc.quantity;
      });
    }
  });

  return Object.entries(colors)
    .filter(([_, count]) => count > 0)
    .map(([color, count]) => ({ color, count, name: colorNames[color] }));
}

export function exportDeckList(deck: Deck): string {
  let output = `// ${deck.name}\n\n`;
  
  if (deck.mainboard.length > 0) {
    output += "// Mainboard\n";
    deck.mainboard.forEach((dc) => {
      output += `${dc.quantity} ${dc.card.name}\n`;
    });
  }

  if (deck.sideboard.length > 0) {
    output += "\n// Sideboard\n";
    deck.sideboard.forEach((dc) => {
      output += `${dc.quantity} ${dc.card.name}\n`;
    });
  }

  return output;
}

export function getRarityBreakdown(deck: Deck): { rarity: string; count: number }[] {
  const rarities: Record<string, number> = {};
  
  deck.mainboard.forEach((dc) => {
    const rarity = dc.card.rarity;
    rarities[rarity] = (rarities[rarity] || 0) + dc.quantity;
  });

  return Object.entries(rarities).map(([rarity, count]) => ({ rarity, count }));
}
