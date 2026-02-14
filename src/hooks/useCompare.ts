/**
 * Hook for card comparison mode.
 * Manages multi-select state (2-4 cards) for side-by-side comparison.
 */

import { useState, useCallback } from 'react';
import type { ScryfallCard } from '@/types/card';

const MAX_COMPARE = 4;

export function useCompare() {
  const [compareCards, setCompareCards] = useState<ScryfallCard[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const isComparing = compareCards.length > 0;

  const toggleCompareCard = useCallback((card: ScryfallCard) => {
    setCompareCards((prev) => {
      const exists = prev.find((c) => c.id === card.id);
      if (exists) {
        return prev.filter((c) => c.id !== card.id);
      }
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, card];
    });
  }, []);

  const removeCompareCard = useCallback((id: string) => {
    setCompareCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareCards([]);
    setCompareOpen(false);
  }, []);

  const openCompare = useCallback(() => {
    if (compareCards.length >= 2) {
      setCompareOpen(true);
    }
  }, [compareCards.length]);

  const closeCompare = useCallback(() => {
    setCompareOpen(false);
  }, []);

  const isCardSelected = useCallback(
    (id: string) => compareCards.some((c) => c.id === id),
    [compareCards],
  );

  return {
    compareCards,
    compareOpen,
    isComparing,
    toggleCompareCard,
    removeCompareCard,
    clearCompare,
    openCompare,
    closeCompare,
    isCardSelected,
  };
}
