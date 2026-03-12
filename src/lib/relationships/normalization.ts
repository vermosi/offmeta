/**
 * Card identity normalization utilities.
 * Ensures consistent card identifiers across the discovery system.
 * @module lib/relationships/normalization
 */

/**
 * Normalizes a card ID (oracle_id) by trimming and lowercasing.
 * Oracle IDs from Scryfall are UUIDs — this ensures safe comparison.
 */
export function normalizeCardId(id: string): string {
  return id.trim().toLowerCase();
}

/**
 * Normalizes a deck entry's card name for consistent matching.
 * Strips extra whitespace and lowercases.
 */
export function normalizeDeckEntry(cardName: string): string {
  return cardName.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Creates a canonical pair key from two card IDs.
 * Always orders alphabetically to ensure A|B === B|A.
 */
export function canonicalPairKey(idA: string, idB: string): string {
  const a = normalizeCardId(idA);
  const b = normalizeCardId(idB);
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
