/**
 * Trending Searches widget — shows popular community searches
 * to help first-time visitors discover what OffMeta can do.
 * Shown on homepage before search for users without search history.
 */

import { useMemo } from 'react';
import { TrendingUp, Search } from 'lucide-react';

// Curated popular searches based on analytics data — rotate periodically
const TRENDING_SEARCHES = [
  'board wipes under $5',
  'sacrifice outlets in Rakdos',
  'creatures that make treasure tokens',
  'mana rocks under $3',
  'free counterspells',
  'ETB creatures in Simic',
  'graveyard recursion in mono black',
  'ramp spells for green',
  'legendary dragons with flying',
  'tutor effects under $10',
  'cards that draw on ETB',
  'removal spells in white',
] as const;

interface TrendingSearchesProps {
  onSearch: (query: string) => void;
  hasHistory: boolean;
}

export function TrendingSearches({ onSearch, hasHistory }: TrendingSearchesProps) {
  // Show fewer if user already has history (they know the app)
  const count = hasHistory ? 4 : 8;

  // Rotate based on day of year so it feels fresh
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const startIdx = dayOfYear % TRENDING_SEARCHES.length;
  const displayed: string[] = [];
  for (let i = 0; i < count; i++) {
    displayed.push(TRENDING_SEARCHES[(startIdx + i) % TRENDING_SEARCHES.length]);
  }

  return (
    <section className="animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-medium text-foreground">
          {hasHistory ? 'Try something new' : 'Popular searches'}
        </h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {displayed.map((query) => (
          <button
            key={query}
            onClick={() => onSearch(query)}
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
              border border-border/50 bg-card/50 hover:bg-primary/10 hover:border-primary/30
              text-sm text-muted-foreground hover:text-foreground
              transition-all duration-200 cursor-pointer"
          >
            <Search className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
            {query}
          </button>
        ))}
      </div>
    </section>
  );
}
