/**
 * Shared deckbuilder constants — kept in a separate file so component files
 * only export React components (required for Vite fast-refresh).
 */

import type { CardPrinting } from '@/lib/scryfall/printings';

export const CATEGORIES = [
  'Commander', 'Creatures', 'Instants', 'Sorceries', 'Artifacts',
  'Enchantments', 'Planeswalkers', 'Lands', 'Ramp', 'Removal',
  'Draw', 'Protection', 'Combo', 'Recursion', 'Utility', 'Finisher', 'Other',
] as const;

/** Module-level cache: card name → image URL or null. Caller should .clear() on unmount. */
export const cardImageFetchCache = new Map<string, string | null>();

/** Module-level cache: card name → printings list. Caller should .clear() on unmount. */
export const printingsByName = new Map<string, CardPrinting[]>();
