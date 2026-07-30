/**
 * Tiny sessionStorage helper for search context.
 */

import { useCallback } from 'react';

const SEARCH_CONTEXT_KEY = 'lastSearchContext';

interface SearchContext {
  previousQuery: string;
  previousScryfall: string;
}

export function useSearchContext() {
  const saveContext = useCallback((query: string, scryfall: string) => {
    const newContext = { previousQuery: query, previousScryfall: scryfall };
    try {
      sessionStorage.setItem(SEARCH_CONTEXT_KEY, JSON.stringify(newContext));
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const getContext = useCallback((): SearchContext | null => {
    try {
      const raw = sessionStorage.getItem(SEARCH_CONTEXT_KEY);
      return raw ? (JSON.parse(raw) as SearchContext) : null;
    } catch {
      return null;
    }
  }, []);

  return { saveContext, getContext };
}
