/**
 * Locally persisted combo bookmarks.
 *
 * Combos are saved to localStorage so the feature works without an account
 * (stateless persistence strategy). Saving is instrumented as a funnel step.
 */

import { useCallback, useEffect, useState } from 'react';
import { trackFunnelStep } from '@/lib/analytics/funnels';
import type { Combo } from '@/components/find-my-combos/types';

const STORAGE_KEY = 'offmeta_saved_combos';
const MAX_SAVED_COMBOS = 200;

export interface SavedCombo {
  id: string;
  cardNames: string[];
  produces: string[];
  identity: string;
  savedAt: number;
}

function readSaved(): SavedCombo[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedCombo[]) : [];
  } catch {
    return [];
  }
}

function writeSaved(combos: SavedCombo[]): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(combos.slice(0, MAX_SAVED_COMBOS)),
    );
  } catch {
    /* quota / private browsing — saving is best-effort */
  }
}

/** Broadcast channel so all mounted combo items stay in sync. */
const SYNC_EVENT = 'offmeta:saved-combos-changed';

export function useSavedCombos() {
  const [saved, setSaved] = useState<SavedCombo[]>([]);

  useEffect(() => {
    setSaved(readSaved());
    const sync = () => setSaved(readSaved());
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const isSaved = useCallback(
    (comboId: string) => saved.some((entry) => entry.id === comboId),
    [saved],
  );

  const toggleSave = useCallback((combo: Combo) => {
    const current = readSaved();
    const exists = current.some((entry) => entry.id === combo.id);
    const next = exists
      ? current.filter((entry) => entry.id !== combo.id)
      : [
          {
            id: combo.id,
            cardNames: combo.cards.map((card) => card.name),
            produces: combo.produces,
            identity: combo.identity,
            savedAt: Date.now(),
          },
          ...current,
        ];

    writeSaved(next);
    setSaved(next.slice(0, MAX_SAVED_COMBOS));
    window.dispatchEvent(new Event(SYNC_EVENT));

    if (!exists) {
      trackFunnelStep('combo_save', {
        combo_id: combo.id,
        card_count: combo.cards.length,
        identity: combo.identity,
        saved_total: next.length,
      });
    }

    return !exists;
  }, []);

  return { saved, isSaved, toggleSave };
}
