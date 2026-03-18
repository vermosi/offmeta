/**
 * Inline trending searches for above-the-fold placement on the homepage.
 * Compact version of TrendingSearches that always shows.
 */

import { useMemo, useState } from 'react';
import { TrendingUp, Search } from 'lucide-react';

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

interface TrendingSearchesInlineProps {
  onSearch: (query: string) => void;
}

export function TrendingSearchesInline({ onSearch }: TrendingSearchesInlineProps) {
  const [dayOfYear] = useState(() =>
    Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000),
  );

  const displayed = useMemo(() => {
    const start = dayOfYear % TRENDING_SEARCHES.length;
    const items: string[] = [];
    for (let i = 0; i < 6; i++) {
      items.push(TRENDING_SEARCHES[(start + i) % TRENDING_SEARCHES.length]);
    }
    return items;
  }, [dayOfYear]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-medium text-foreground">Try a search</h2>
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
    </div>
  );
}
