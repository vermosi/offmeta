/**
 * Hook for managing search history in localStorage.
 */

import { useState, useCallback } from 'react';
import { CLIENT_CONFIG } from '@/lib/config';

const SEARCH_HISTORY_KEY = 'offmeta_search_history';

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addToHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    setHistory((prev) => {
      const filtered = prev.filter(
        (q) => q.toLowerCase() !== query.toLowerCase(),
      );
      const updated = [query, ...filtered].slice(0, CLIENT_CONFIG.MAX_HISTORY_ITEMS);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage failures.
      }
      return updated;
    });
  }, []);

  const removeFromHistory = useCallback((queryToRemove: string) => {
    setHistory((prev) => {
      const updated = prev.filter(
        (q) => q.toLowerCase() !== queryToRemove.toLowerCase(),
      );
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage failures.
      }
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      // Ignore storage failures.
    }
  }, []);

  return { history, addToHistory, removeFromHistory, clearHistory };
}
