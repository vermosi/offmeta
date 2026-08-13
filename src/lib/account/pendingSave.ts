/**
 * Pending save intents.
 *
 * When a signed-out visitor taps Save we stash what they meant to save, show
 * the sign-in pitch, and replay the save once a session exists — so they never
 * have to find the card again after authenticating.
 *
 * sessionStorage (not localStorage): an intent should not survive the tab.
 */

export interface PendingCardSave {
  type: 'card';
  card: SavedCardInput;
}

export interface PendingSearchSave {
  type: 'search';
  naturalQuery: string;
  scryfallQuery?: string | null;
  resultCount?: number | null;
}

export type PendingSave = PendingCardSave | PendingSearchSave;

/** Denormalized card fields stored alongside a save for offline display. */
export interface SavedCardInput {
  oracleId: string;
  cardName: string;
  scryfallId?: string | null;
  imageUrl?: string | null;
  manaCost?: string | null;
  cmc?: number | null;
  typeLine?: string | null;
  colors?: string[];
  priceUsd?: number | null;
}

const STORAGE_KEY = 'offmeta_pending_save';

export function setPendingSave(intent: PendingSave): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
  } catch {
    /* private browsing — the user can simply save again */
  }
}

export function takePendingSave(): PendingSave | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(STORAGE_KEY);
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'type' in parsed &&
      ((parsed as PendingSave).type === 'card' ||
        (parsed as PendingSave).type === 'search')
    ) {
      return parsed as PendingSave;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearPendingSave(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}
