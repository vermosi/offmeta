/**
 * Shared deckbuilder constants and module-level caches.
 *
 * Kept in a dedicated file (not inside component files) so that every
 * component file exports only React components — a requirement for Vite's
 * fast-refresh to work correctly (react-refresh/only-export-components).
 *
 * ## Module-level caches
 *
 * `cardImageFetchCache` and `printingsByName` are intentionally module-level
 * Maps so they persist across re-renders and are shared between all instances
 * of the deck editor in the same tab session.  DeckEditor clears both on
 * unmount (via `useEffect` return) to prevent stale data leaking between deck
 * sessions.
 *
 * @module components/deckbuilder/constants
 */

import type { CardPrinting } from '@/lib/scryfall/printings';

/**
 * Ordered list of functional card categories used throughout the deck editor.
 * AI categorization (deck-categorize edge function) maps cards to these labels.
 * Users can also manually reassign categories via the row dropdown.
 */
export const CATEGORIES = [
  'Commander', 'Creatures', 'Instants', 'Sorceries', 'Artifacts',
  'Enchantments', 'Planeswalkers', 'Lands', 'Ramp', 'Removal',
  'Draw', 'Protection', 'Combo', 'Recursion', 'Utility', 'Finisher', 'Other',
] as const;

/**
 * Module-level cache: card name → hover image URL (or null if not found).
 * Populated lazily by `CardHoverImage` on first hover.
 * Call `.clear()` on deck editor unmount to prevent cross-session leakage.
 */
export const cardImageFetchCache = new Map<string, string | null>();

/**
 * Module-level cache: card name → all known printings from Scryfall.
 * Populated lazily by `PrintingPickerPopover` on first open.
 * Call `.clear()` on deck editor unmount to prevent cross-session leakage.
 */
export const printingsByName = new Map<string, CardPrinting[]>();
