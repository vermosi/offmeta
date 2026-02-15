/**
 * Horizontal scrollable chips showing related search suggestions.
 * Appears below the ExplainCompilationPanel after a search.
 */

import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getSimilarSearches } from '@/data/similar-searches';
import { Search, BookOpen } from 'lucide-react';
import { cn } from '@/lib/core/utils';

interface SimilarSearchesProps {
  originalQuery: string;
  onSuggestionClick: (query: string) => void;
}

export const SimilarSearches = memo(function SimilarSearches({
  originalQuery,
  onSuggestionClick,
}: SimilarSearchesProps) {
  const suggestions = useMemo(
    () => getSimilarSearches(originalQuery),
    [originalQuery],
  );

  if (suggestions.length === 0) return null;

  return (
    <div className="w-full mx-auto" style={{ maxWidth: 'clamp(320px, 90vw, 672px)' }}>
      <p className="text-xs text-muted-foreground mb-2 px-1">Similar searches</p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {suggestions.map((s) => (
          <div key={s.label} className="flex-shrink-0">
            {s.guidePath ? (
              <Link
                to={s.guidePath}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
                  'border border-border bg-card hover:bg-accent hover:text-accent-foreground',
                  'transition-colors duration-150 whitespace-nowrap',
                )}
              >
                <BookOpen className="h-3 w-3" />
                {s.label}
              </Link>
            ) : (
              <button
                onClick={() => onSuggestionClick(s.query)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
                  'border border-border bg-card hover:bg-accent hover:text-accent-foreground',
                  'transition-colors duration-150 whitespace-nowrap cursor-pointer',
                )}
              >
                <Search className="h-3 w-3" />
                {s.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
