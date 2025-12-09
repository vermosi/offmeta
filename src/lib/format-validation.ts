import { Deck, DeckCard } from "./deck";
import { ScryfallCard } from "@/types/card";

export type DeckFormat = "standard" | "modern" | "legacy" | "vintage" | "commander" | "pioneer" | "pauper";

export interface FormatValidation {
  format: DeckFormat;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CardLegalityIssue {
  card: ScryfallCard;
  status: string;
  quantity: number;
}

const formatRequirements: Record<DeckFormat, { minCards: number; maxCards: number; maxCopies: number }> = {
  standard: { minCards: 60, maxCards: Infinity, maxCopies: 4 },
  modern: { minCards: 60, maxCards: Infinity, maxCopies: 4 },
  legacy: { minCards: 60, maxCards: Infinity, maxCopies: 4 },
  vintage: { minCards: 60, maxCards: Infinity, maxCopies: 4 },
  pioneer: { minCards: 60, maxCards: Infinity, maxCopies: 4 },
  pauper: { minCards: 60, maxCards: Infinity, maxCopies: 4 },
  commander: { minCards: 100, maxCards: 100, maxCopies: 1 },
};

export function validateDeckFormat(deck: Deck, format: DeckFormat): FormatValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requirements = formatRequirements[format];
  
  // Count total cards
  const totalCards = deck.mainboard.reduce((sum, dc) => sum + dc.quantity, 0);
  
  // Check minimum cards
  if (totalCards < requirements.minCards) {
    errors.push(`Deck needs at least ${requirements.minCards} cards (currently ${totalCards})`);
  }
  
  // Check maximum cards (for Commander)
  if (requirements.maxCards !== Infinity && totalCards > requirements.maxCards) {
    errors.push(`Deck can have at most ${requirements.maxCards} cards (currently ${totalCards})`);
  }
  
  // Check card copies
  deck.mainboard.forEach((dc) => {
    // Basic lands are exempt from copy limits
    const isBasicLand = dc.card.type_line?.toLowerCase().includes("basic land");
    
    if (!isBasicLand && dc.quantity > requirements.maxCopies) {
      errors.push(`${dc.card.name}: Maximum ${requirements.maxCopies} copies allowed (have ${dc.quantity})`);
    }
  });
  
  // Check card legality
  const illegalCards = getIllegalCards(deck, format);
  illegalCards.forEach((issue) => {
    if (issue.status === "banned") {
      errors.push(`${issue.card.name} is banned in ${format}`);
    } else if (issue.status === "restricted") {
      if (issue.quantity > 1) {
        errors.push(`${issue.card.name} is restricted to 1 copy in ${format}`);
      } else {
        warnings.push(`${issue.card.name} is restricted in ${format}`);
      }
    } else if (issue.status === "not_legal") {
      warnings.push(`${issue.card.name} is not legal in ${format}`);
    }
  });
  
  return {
    format,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getIllegalCards(deck: Deck, format: DeckFormat): CardLegalityIssue[] {
  const issues: CardLegalityIssue[] = [];
  
  deck.mainboard.forEach((dc) => {
    const legality = dc.card.legalities[format];
    if (legality && legality !== "legal") {
      issues.push({
        card: dc.card,
        status: legality,
        quantity: dc.quantity,
      });
    }
  });
  
  deck.sideboard.forEach((dc) => {
    const legality = dc.card.legalities[format];
    if (legality && legality !== "legal") {
      // Only add if not already in the list
      if (!issues.find((i) => i.card.id === dc.card.id)) {
        issues.push({
          card: dc.card,
          status: legality,
          quantity: dc.quantity,
        });
      }
    }
  });
  
  return issues;
}

export function getFormatDisplayName(format: DeckFormat): string {
  const names: Record<DeckFormat, string> = {
    standard: "Standard",
    modern: "Modern",
    legacy: "Legacy",
    vintage: "Vintage",
    commander: "Commander",
    pioneer: "Pioneer",
    pauper: "Pauper",
  };
  return names[format];
}
