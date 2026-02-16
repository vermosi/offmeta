/**
 * Recent Searches widget for the homepage.
 * Shows returning users their recent search queries for quick re-access.
 * Only renders when the user has search history.
 */

import { useState } from 'react';
import { Clock, X, Trash2 } from 'lucide-react';

const SEARCH_HISTORY_KEY = 'offmeta_search_history';

interface RecentSearchesProps {
  onSearch: (query: string) => void;
}

export function RecentSearches({ onSearch }: RecentSearchesProps) {
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const removeItem = (query: string) => {
    const updated = history.filter((q) => q.toLowerCase() !== query.toLowerCase());
    setHistory(updated);
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const clearAll = () => {
    setHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      // Ignore
    }
  };

  if (history.length === 0) return null;

  const displayed = history.slice(0, 6);

  return (
    <section aria-labelledby="recent-searches-heading">
      <div className="flex items-center justify-between mb-3">
        <h2
          id="recent-searches-heading"
          className="text-sm font-medium text-foreground flex items-center gap-1.5"
        >
          <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          Recent Searches
        </h2>
        <button
          onClick={clearAll}
          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          aria-label="Clear all recent searches"
        >
          <Trash2 className="h-3 w-3" aria-hidden="true" />
          Clear
        </button>
      </div>

      <div
        className="flex flex-wrap gap-1.5"
        role="list"
        aria-label="Recent search queries"
      >
        {displayed.map((query) => (
          <div
            key={query}
            role="listitem"
            className="group flex items-center gap-1 pl-3 pr-1 py-1.5 rounded-full border border-border/60 bg-card/50 hover:bg-secondary/80 hover:border-border transition-all duration-150"
          >
            <button
              onClick={() => onSearch(query)}
              className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[200px]"
              aria-label={`Search again for ${query}`}
            >
              {query}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeItem(query);
              }}
              className="p-0.5 rounded-full text-muted-foreground/50 hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
              aria-label={`Remove "${query}" from history`}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
