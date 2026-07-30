/**
 * Hook for persisting search context (previous query/Scryfall result) in session storage.
 */

import { useState, useCallback } from 'react';

const SEARCH_CONTEXT_KEY = 'lastSearchContext';

interface SearchContext {
  previousQuery: string;
  previousScryfall: string;
}

export function useSearchContext() {
  const [context, setContext] = useState<SearchContext | null>(null);

  const saveContext = useCallback((query: string, scryfall: string) => {
    const newContext = { previousQuery: query, previousScryfall: scryfall };
    setContext(newContext);
    try {
      sessionStorage.setItem(SEARCH_CONTEXT_KEY, JSON.stringify(newContext));
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const getContext = useCallback(() => context, [context]);

  return { saveContext, getContext };
}
