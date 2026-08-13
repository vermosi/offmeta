/**
 * PageSearchBar — compact, persistent natural-language search bar
 * shown on long-tail content pages (cards, guides, combos) to convert
 * inbound SEO traffic into additional searches.
 */

import { useState, useId, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { queryToSlug } from '@/lib/search-slug';

interface PageSearchBarProps {
  placeholder?: string;
  /** Optional pre-filled query suggestion */
  initialValue?: string;
  className?: string;
}

export function PageSearchBar({
  placeholder = 'Search Magic cards in plain English…',
  initialValue = '',
  className,
}: PageSearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const navigate = useNavigate();
  const inputId = useId();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) {
      navigate('/');
      return;
    }
    navigate(`/search/${queryToSlug(q)}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={
        'flex items-center gap-3 border border-border/70 bg-background px-4 py-3 focus-within:border-foreground/60 transition-colors ' +
        (className ?? '')
      }
    >
      <Search
        className="h-4 w-4 text-muted-foreground shrink-0"
        aria-hidden="true"
      />
      <label htmlFor={inputId} className="sr-only">
        Search Magic cards
      </label>
      <input
        id={inputId}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        className="shrink-0 inline-flex items-center gap-1 px-4 py-2 bg-foreground text-background font-mono text-[11px] uppercase tracking-[0.24em] hover:bg-foreground/90 transition-colors focus-ring"
      >
        Search
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </form>
  );
}
