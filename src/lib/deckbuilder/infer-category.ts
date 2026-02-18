/**
 * Infers a deck category string from a card's type line.
 * Used as a fast local fallback before the AI categorizer responds.
 * @module lib/deckbuilder/infer-category
 */

import type { ScryfallCard } from '@/types/card';

export const DEFAULT_CATEGORY = 'Other';

export function inferCategory(card: ScryfallCard): string {
  const type = card.type_line?.toLowerCase() || '';
  if (type.includes('land')) return 'Lands';
  if (type.includes('creature')) return 'Creatures';
  if (type.includes('instant')) return 'Instants';
  if (type.includes('sorcery')) return 'Sorceries';
  if (type.includes('artifact')) return 'Artifacts';
  if (type.includes('enchantment')) return 'Enchantments';
  if (type.includes('planeswalker')) return 'Planeswalkers';
  return DEFAULT_CATEGORY;
}
