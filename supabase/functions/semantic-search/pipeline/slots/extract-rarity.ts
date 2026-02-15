/**
 * Slot Extraction – Rarity & Negations
 * @module pipeline/slots/extract-rarity
 */

import { CARD_TYPES } from '../../shared-mappings.ts';
import { RARITY_MAP } from './constants.ts';

export function extractRarity(query: string): {
  rarity: string | null;
  remaining: string;
} {
  let remaining = query;

  for (const [alias, rarity] of Object.entries(RARITY_MAP)) {
    const pattern = new RegExp(`\\b${alias}\\b`, 'gi');
    if (pattern.test(remaining)) {
      remaining = remaining.replace(pattern, '').trim();
      return { rarity, remaining };
    }
  }

  return { rarity: null, remaining };
}

export function extractNegations(query: string): {
  excludedTypes: string[];
  excludedText: string[];
  remaining: string;
} {
  let remaining = query;
  const excludedTypes: string[] = [];
  const excludedText: string[] = [];

  const negPatterns = [
    /\b(?:not|without|no|doesn't|does not|isn't|is not)\s+([a-z]+)\b/gi,
  ];

  for (const pattern of negPatterns) {
    let match;
    while ((match = pattern.exec(remaining)) !== null) {
      const term = match[1].toLowerCase();

      if (
        CARD_TYPES.includes(term) ||
        CARD_TYPES.includes(term.replace(/s$/, ''))
      ) {
        const singularType = term.replace(/s$/, '');
        if (!excludedTypes.includes(singularType)) {
          excludedTypes.push(singularType);
        }
      } else {
        excludedText.push(term);
      }

      remaining = remaining.replace(match[0], '').trim();
    }
  }

  return { excludedTypes, excludedText, remaining };
}
