/**
 * useQuerySuggestions — generates progressively simpler query alternatives
 * when a search returns 0 results, and validates them against Scryfall.
 */

import { useState, useEffect, useRef } from 'react';

const SCRYFALL_SEARCH_URL = 'https://api.scryfall.com/cards/search';

export interface QuerySuggestion {
  query: string;
  label: string;
  totalCards: number;
}

/**
 * Simplification strategies applied in order.
 * Each returns null if it can't simplify further.
 */
const SIMPLIFY_STRATEGIES: Array<{
  label: string;
  apply: (q: string) => string | null;
}> = [
  // 1. Remove price constraints
  {
    label: 'Without price filter',
    apply: (q) => {
      const simplified = q.replace(/\s*usd[<>=]+\d+(\.\d+)?\b/gi, '').trim();
      return simplified !== q ? simplified : null;
    },
  },
  // 2. Remove year constraints
  {
    label: 'Without year filter',
    apply: (q) => {
      const simplified = q.replace(/\s*year[<>=]+\d+\b/gi, '').trim();
      return simplified !== q ? simplified : null;
    },
  },
  // 3. Remove format restrictions
  {
    label: 'Without format restriction',
    apply: (q) => {
      const simplified = q.replace(/\s*f:\w+\b/gi, '').trim();
      return simplified !== q ? simplified : null;
    },
  },
  // 4. Remove rarity constraints
  {
    label: 'Without rarity filter',
    apply: (q) => {
      const simplified = q.replace(/\s*r[<>=]+\w+\b/gi, '').trim();
      return simplified !== q ? simplified : null;
    },
  },
  // 5. Remove type exclusions (-t:)
  {
    label: 'Without type exclusions',
    apply: (q) => {
      const simplified = q.replace(/\s*-t:\w+\b/gi, '').trim();
      return simplified !== q ? simplified : null;
    },
  },
  // 6. Remove color identity constraints (id<=, id:, id=)
  {
    label: 'Without color restriction',
    apply: (q) => {
      const simplified = q
        .replace(/\s*id[<>=]+\w+\b/gi, '')
        .replace(/\s*-id=\w+\b/gi, '')
        .replace(/\s*c[<>=]+\w+\b/gi, '')
        .trim();
      return simplified !== q ? simplified : null;
    },
  },
  // 7. Remove is: constraints (is:commander, is:reprint, etc.)
  {
    label: 'Without card property filter',
    apply: (q) => {
      const simplified = q.replace(/\s*is:\w+\b/gi, '').trim();
      return simplified !== q ? simplified : null;
    },
  },
  // 8. Remove complex oracle text patterns (keep otag: which are more reliable)
  {
    label: 'Without oracle text filter',
    apply: (q) => {
      const simplified = q
        .replace(/\s*o:"[^"]*"/gi, '')
        .replace(/\s*o:[^\s)]+/gi, '')
        .replace(/\(\s*\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      return simplified !== q && simplified.length > 0 ? simplified : null;
    },
  },
  // 9. Remove mana value constraints
  {
    label: 'Without mana value filter',
    apply: (q) => {
      const simplified = q.replace(/\s*mv[<>=]+\d+\b/gi, '').trim();
      return simplified !== q ? simplified : null;
    },
  },
];

/**
 * Generates up to `maxSuggestions` simplified query alternatives
 * by progressively removing constraints.
 */
function generateSimplifiedQueries(
  query: string,
  maxSuggestions: number = 3,
): Array<{ query: string; label: string }> {
  const seen = new Set<string>([query.toLowerCase()]);
  const results: Array<{ query: string; label: string }> = [];
  let current = query;

  for (const strategy of SIMPLIFY_STRATEGIES) {
    if (results.length >= maxSuggestions) break;

    const simplified = strategy.apply(current);
    if (!simplified) continue;

    // Clean up empty parens and extra whitespace
    const cleaned = simplified
      .replace(/\(\s*\)/g, '')
      .replace(/\(\s*or\s*\)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned || cleaned.length < 2) continue;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({ query: cleaned, label: strategy.label });
    current = cleaned; // progressive: each step builds on the last
  }

  return results;
}

/**
 * Validates a query against Scryfall and returns result count.
 * Lightweight: only fetches page 1 to check total_cards.
 */
async function checkQueryResults(query: string): Promise<number | null> {
  try {
    const url = `${SCRYFALL_SEARCH_URL}?q=${encodeURIComponent(query)}&page=1`;
    const response = await fetch(url);

    if (response.status === 200) {
      const data = await response.json();
      return data.total_cards ?? 0;
    }

    // Consume body to avoid leak
    await response.text();
    return response.status === 404 ? 0 : null;
  } catch {
    return null;
  }
}

/**
 * Hook that generates and validates simpler query alternatives
 * when the current search returns 0 results.
 */
export function useQuerySuggestions(
  query: string,
  totalCards: number,
  hasSearched: boolean,
) {
  const [suggestions, setSuggestions] = useState<QuerySuggestion[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef('');

  useEffect(() => {
    // Only trigger when we have 0 results for a real search
    if (!hasSearched || totalCards > 0 || !query || query.length < 3) {
      setSuggestions([]);
      setIsChecking(false);
      return;
    }

    // Skip if we already checked this exact query
    if (lastQueryRef.current === query) return;
    lastQueryRef.current = query;

    // Cancel any in-flight checks
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const candidates = generateSimplifiedQueries(query, 3);
    if (candidates.length === 0) {
      setSuggestions([]);
      return;
    }

    setIsChecking(true);

    // Check candidates sequentially with 100ms delay between (Scryfall rate limit)
    (async () => {
      const validated: QuerySuggestion[] = [];

      for (const candidate of candidates) {
        if (controller.signal.aborted) return;

        const count = await checkQueryResults(candidate.query);
        if (controller.signal.aborted) return;

        if (count !== null && count > 0) {
          validated.push({
            query: candidate.query,
            label: candidate.label,
            totalCards: count,
          });
        }

        // Respect Scryfall rate limits
        await new Promise((r) => setTimeout(r, 100));
      }

      if (!controller.signal.aborted) {
        setSuggestions(validated);
        setIsChecking(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [query, totalCards, hasSearched]);

  return { suggestions, isChecking };
}
